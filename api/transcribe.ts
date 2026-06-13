import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { memoId } = req.body;

    if (!memoId) {
      return res.status(400).json({ error: "Missing memoId" });
    }

    // --- Supabase (Service Role nötig!)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase env vars");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    // --- User aus Token holen
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid user" });
    }

    // --- Memo holen
    const { data: memo, error: memoError } = await supabase
      .from("memos")
      .select("*")
      .eq("id", memoId)
      .eq("user_id", user.id)
      .single();

    if (memoError || !memo) {
      return res.status(404).json({ error: "Memo not found" });
    }

    const audioResponse = await fetch(memo.audio_url);

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    
    const arrayBuffer = await audioResponse.arrayBuffer();
    
    // 🔥 WICHTIG: Blob statt File
    const blob = new Blob([arrayBuffer], {
      type: memo.mime_type || "audio/webm",
    });
    
    // OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    
    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file: blob as any,
    });

    const text = transcription.text;

    // --- In Supabase speichern
    const { error: updateError } = await supabase
      .from("memos")
      .update({
        transcript_text: text,
      })
      .eq("id", memoId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      ok: true,
      memoId,
      transcript: text,
    });
  } catch (error: any) {
    console.error("TRANSCRIBE ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Unknown error",
    });
  }
}