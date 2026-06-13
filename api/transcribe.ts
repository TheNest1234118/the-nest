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
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // --- Audio downloaden aus Supabase Storage (signed URL)
    const audioResponse = await fetch(memo.audio_url);
    const audioBuffer = await audioResponse.arrayBuffer();

    const file = new File(
      [audioBuffer],
      "audio." + (memo.mime_type?.includes("mp4") ? "m4a" : "webm"),
      { type: memo.mime_type }
    );

    // --- OpenAI Transcription
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file,
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