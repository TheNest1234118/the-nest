import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI, { toFile } from "openai";
import { embedMemory } from "./embed-memory.js";

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
  console.log("TRANSCRIBE START", {
    memoId,
    forceRetry: req.body?.forceRetry === true,
  });
  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    //await supabase
      //.from("memos")
      //.update({
       // status: "pending",
       // processing_started_at: new Date().toISOString(),
        //transcript_error: null,
      //})
      //.eq("id", memoId);

    const { data: memo, error: memoError } = await supabase
      .from("memos")
      .select("*")
      .eq("id", memoId)
      .single();

    if (memoError || !memo) {
      throw new Error("Memo not found");
    }
    console.log("TRANSCRIBE MEMO", {
      id: memo.id,
      status: memo.status,
      storage_path: memo.storage_path,
      mime_type: memo.mime_type,
      transcript_error: memo.transcript_error,
      processing_started_at: memo.processing_started_at,
      processing_finished_at: memo.processing_finished_at,
    });
    if (memo.status === "ready" && memo.transcript_error === "Transcription disabled by user.") {
      return res.status(200).json({
        ok: true,
        memoId,
        skipped: "transcription disabled by user",
      });
    }
    const currentMonth = new Date().toISOString().slice(0, 7);

const { data: profile } = await supabase
  .from("profiles")
  .select("plan, transcriptions_this_month, transcription_month")
  .eq("user_id", memo.user_id)
  .maybeSingle();

let plan = profile?.plan || "free";
let count = profile?.transcriptions_this_month || 0;
let month = profile?.transcription_month || currentMonth;

if (month !== currentMonth) {
  count = 0;
  month = currentMonth;

  await supabase.from("profiles").upsert({
    user_id: memo.user_id,
    plan,
    transcriptions_this_month: 0,
    transcription_month: currentMonth,
    updated_at: new Date().toISOString(),
  });
}

if (plan !== "supporter" && count >= 30) {
  await supabase
    .from("memos")
    .update({
      status: "ready",
      transcript_text: null,
      transcript_error:
        "Free monthly transcription limit reached. Audio was saved.",
      processing_finished_at: new Date().toISOString(),
    })
    .eq("id", memoId);

  return res.status(200).json({
    ok: false,
    limitReached: true,
    error:
      "You've reached the free monthly transcription limit. Your voice capsule is safely stored. Upgrade to Supporter for unlimited transcriptions.",
  });
}
    if (memo.status === "ready" && memo.transcript_text) {
      return res.status(200).json({
        ok: true,
        memoId,
        skipped: "already transcribed",
      });
    }
    
    const forceRetry = req.body?.forceRetry === true;

    if (!forceRetry && memo.processing_started_at && !memo.processing_finished_at) {
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
    
    await supabase
      .from("memos")
      .update({
        status: "processing",
        processing_started_at: new Date().toISOString(),
        processing_finished_at: null,
        transcript_error: null,
      })
      .eq("id", memoId);
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
    const maxBytes = 24 * 1024 * 1024;

    if (buffer.length > maxBytes) {
      await supabase
        .from("memos")
        .update({
          status: "ready",
          transcript_error:
            "Audio saved. This recording is too large to transcribe in one piece.",
          processing_finished_at: new Date().toISOString(),
        })
        .eq("id", memoId);
    
      return res.status(200).json({
        ok: false,
        error:
          "Audio saved. This recording is too large to transcribe in one piece.",
      });
    }
    const filename =
      memo.mime_type?.includes("mp4") || memo.mime_type?.includes("aac")
        ? "audio.m4a"
        : memo.mime_type?.includes("ogg")
        ? "audio.ogg"
        : "audio.webm";

    const file = await toFile(buffer, filename, {
      type: memo.mime_type || "audio/webm",
    });
    console.log("TRANSCRIBE OPENAI START", {
      memoId,
      filename,
      bufferSize: buffer.length,
      mimeType: memo.mime_type,
    });
    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file,
    });
    console.log("TRANSCRIBE OPENAI DONE", {
      memoId,
      textLength: transcription.text?.length || 0,
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
      await embedMemory({
        userId: memo.user_id,
        sourceType: "memo",
        sourceId: memo.id,
        content: transcription.text,
        contentCreatedAt: memo.created_at,
      });
      if (plan !== "supporter") {
        await supabase.from("profiles").upsert({
          user_id: memo.user_id,
          plan,
          transcriptions_this_month: count + 1,
          transcription_month: currentMonth,
          updated_at: new Date().toISOString(),
        });
      }

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