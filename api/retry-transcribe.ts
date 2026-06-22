import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const memoId = req.body?.memoId;

    if (!token) return res.status(401).json({ error: "Missing login token" });
    if (!memoId) return res.status(400).json({ error: "Missing memo id" });

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return res.status(500).json({ error: "Missing env vars" });
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid login" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: memo, error: memoError } = await supabase
      .from("memos")
      .select("id, user_id, storage_path, status")
      .eq("id", memoId)
      .eq("user_id", user.id)
      .single();

    if (memoError || !memo) {
      return res.status(404).json({ error: "Memo not found" });
    }

    if (!memo.storage_path) {
      return res.status(400).json({ error: "This memo has no saved audio." });
    }

    await supabase
      .from("memos")
      .update({
        status: "processing",
        transcript_error: null,
        processing_started_at: null,
        processing_finished_at: null,
      })
      .eq("id", memoId);

    const webhookUrl = `${process.env.PUBLIC_APP_URL || "https://www.thenestapp.space"}/api/transcribe`;

    const transcribeRes = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": process.env.TRANSCRIBE_WEBHOOK_SECRET || "",
        },
        body: JSON.stringify({
          record: {
            id: memoId,
          },
          forceRetry: true,
        }),
      });
      
      const transcribeText = await transcribeRes.text();
      
      return res.status(200).json({
        ok: transcribeRes.ok,
        transcribeStatus: transcribeRes.status,
        transcribeResponse: transcribeText,
      });
  } catch (error: any) {
    console.error("RETRY TRANSCRIBE ERROR:", error);
    return res.status(500).json({
      error: error.message || "Could not retry transcription.",
    });
  }
}