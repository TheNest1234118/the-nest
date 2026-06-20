import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI, { toFile } from "openai";

export const config = {
  maxDuration: 300,
};

type SupabaseWebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record?: {
    id?: string;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = req.headers["x-webhook-secret"];

  if (webhookSecret !== process.env.TRANSCRIBE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = req.body as any;

  const memoId =
    payload.record?.id ||
    payload.new?.id ||
    payload.old_record?.id ||
    payload.old?.id ||
    payload.id;
  
  if (!memoId) {
    console.log("TRANSCRIBE PAYLOAD:", JSON.stringify(payload));
    return res.status(400).json({ error: "Missing memo id" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    return res.status(500).json({ error: "Missing env vars" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    await supabase
      .from("memos")
      .update({
        status: "pending",
        processing_started_at: new Date().toISOString(),
        transcript_error: null,
      })
      .eq("id", memoId);

    const { data: memo, error: memoError } = await supabase
      .from("memos")
      .select("*")
      .eq("id", memoId)
      .single();

    if (memoError || !memo) {
      throw new Error("Memo not found");
    }
    if (memo.status === "ready" && memo.transcript_text) {
      return res.status(200).json({
        ok: true,
        memoId,
        skipped: "already transcribed",
      });
    }
    
    if (memo.processing_started_at && !memo.processing_finished_at) {
      const started = new Date(memo.processing_started_at).getTime();
      const ageMinutes = (Date.now() - started) / 60000;
    
      if (ageMinutes < 10) {
        return res.status(200).json({
          ok: true,
          memoId,
          skipped: "already processing",
        });
      }
    }
    if (!memo.storage_path) {
      throw new Error("Missing storage_path");
    }
    //if (memo.duration > 900) {
      //throw new Error("Voice capsule is longer than 15 minutes. Audio was saved, but transcription is skipped for now.");
    //}
    const { data: audioBlob, error: downloadError } = await supabase.storage
      .from("memos")
      .download(memo.storage_path);

    if (downloadError || !audioBlob) {
      throw downloadError || new Error("Could not download audio");
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename =
      memo.mime_type?.includes("mp4") || memo.mime_type?.includes("aac")
        ? "audio.m4a"
        : memo.mime_type?.includes("ogg")
        ? "audio.ogg"
        : "audio.webm";

    const file = await toFile(buffer, filename, {
      type: memo.mime_type || "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file,
    });

    await supabase
      .from("memos")
      .update({
        transcript_text: transcription.text,
        status: "ready",
        processing_finished_at: new Date().toISOString(),
        transcript_error: null,
      })
      .eq("id", memoId);

    return res.status(200).json({
      ok: true,
      memoId,
    });
  } catch (error: any) {
    console.error("TRANSCRIBE ERROR:", error);

    await supabase
      .from("memos")
      .update({
        status: "failed",
        transcript_error: error.message || "Unknown error",
        processing_finished_at: new Date().toISOString(),
      })
      .eq("id", memoId);

      return res.status(200).json({
        ok: false,
        error: error.message || "Unknown error",
      }); 
  }
}