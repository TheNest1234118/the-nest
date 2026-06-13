import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { memoId } = req.body;

    if (!memoId) {
      return res.status(400).json({ ok: false, error: "Missing memoId" });
    }

    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing login token" });
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          transport: ws as any,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ ok: false, error: "Invalid login" });
    }

    const { data: memo, error: memoError } = await supabase
      .from("memos")
      .select("id, user_id, audio_url, mime_type")
      .eq("id", memoId)
      .eq("user_id", user.id)
      .single();

    if (memoError || !memo) {
      return res.status(404).json({ ok: false, error: "Memo not found" });
    }

    /**
     * ✅ STABLE FIX: kein fetch(publicUrl) mehr
     */

    const url = new URL(memo.audio_url);
    const parts = url.pathname.split("/");

    const bucketIndex = parts.findIndex((p) => p === "memos");
    const filePath = parts.slice(bucketIndex + 1).join("/");

    const { data: file, error: downloadError } = await supabase.storage
      .from("memos")
      .download(filePath);

    if (downloadError || !file) {
      return res.status(500).json({
        ok: false,
        error: "Could not download audio file",
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    console.log("file size bytes:", arrayBuffer.byteLength);
    console.log("mime:", memo.mime_type);
    if (!arrayBuffer.byteLength) {
      return res.status(500).json({
        ok: false,
        error: "Audio file is empty",
      });
    }

    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: memo.mime_type || "audio/webm",
          data: base64Audio,
        },
      },
      {
        text: `
Transcribe this private voice memo accurately.
Only return the spoken text.
Do not summarize.
Do not analyze.
Do not add labels, timestamps, diagnosis, advice, or commentary.
If parts are unclear, write [unclear].
        `.trim(),
      },
    ]);

    const transcript = result.response.text().trim();
    console.log("=== TRANSCRIPT RAW ===");
    console.log(transcript);
    console.log("length:", transcript?.length);
    console.log("UPDATING MEMO WITH:");
console.log({
  id: memo.id,
  transcriptPreview: transcript?.slice(0, 100),
});
    const { data: updated, error: updateError } = await supabase
      .from("memos")
      .update({
        transcript_text: transcript,
      })
      .eq("id", memo.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      ok: true,
      memo: updated,
      transcript,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: String(error?.message || error),
    });
  }
}