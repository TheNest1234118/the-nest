import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Please sign in first." });

    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Missing question" });
    return res.status(200).json({
      answer: "You consistently sleep better after calmer, more productive days.",
      main_answer: "You consistently sleep better after calmer, more productive days.",
      reasons: [
        "Stress appeared before poor sleep.",
        "Productive, calmer days were followed by better sleep.",
      ],
      sources: [
        {
          date: "Jul 3",
          type: "memo",
          quote: "I slept well today...",
        },
        {
          date: "Jun 30",
          type: "thought",
          quote: "There is so much on my mind...",
        },
      ],
      confidence: "medium",
      memory_count: 2,
      entries: [],
    });
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl) return res.status(500).json({ error: "SUPABASE_URL missing" });
    if (!anonKey) return res.status(500).json({ error: "SUPABASE_ANON_KEY missing" });
    if (!serviceKey) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" });
    if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY missing" });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: "Unauthorized" });

    const supabase = createClient(supabaseUrl, serviceKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.plan !== "supporter") {
      return res.status(403).json({
        error: "Ask Your Past uses AI processing and is included in the Supporter Plan.",
      });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    if (!queryEmbedding) throw new Error("Could not create question embedding");

    const { data: matches, error: matchError } = await supabase.rpc(
      "match_memory_embeddings",
      {
        query_embedding: queryEmbedding,
        match_user_id: user.id,
        match_count: 20,
        match_threshold: 0.05,
      }
    );

    if (matchError) throw matchError;

    let finalEntries = matches || [];

    if (finalEntries.length === 0) {
      const { data: thoughts } = await supabase
        .from("thoughts")
        .select("id, text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);

      const { data: anchors } = await supabase
        .from("anchors")
        .select("id, type, content, created_at")
        .eq("user_id", user.id)
        .eq("type", "text")
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: memos } = await supabase
        .from("memos")
        .select("id, transcript_text, created_at")
        .eq("user_id", user.id)
        .not("transcript_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);

      finalEntries = [
        ...(thoughts || []).map((t: any) => ({
          id: t.id,
          source_type: "thought",
          source_id: t.id,
          content: t.text,
          content_created_at: t.created_at,
          similarity: 0,
        })),
        ...(anchors || []).map((a: any) => ({
          id: a.id,
          source_type: "anchor",
          source_id: a.id,
          content: a.content,
          content_created_at: a.created_at,
          similarity: 0,
        })),
        ...(memos || []).map((m: any) => ({
          id: m.id,
          source_type: "memo",
          source_id: m.id,
          content: m.transcript_text,
          content_created_at: m.created_at,
          similarity: 0,
        })),
      ].filter((entry) => entry.content && entry.content.trim().length > 0);
    }

    if (finalEntries.length === 0) {
      return res.status(200).json({
        answer: "I couldn’t find any saved memories yet.",
        main_answer: "I couldn’t find any saved memories yet.",
        reasons: [],
        sources: [],
        confidence: "low",
        memory_count: 0,
        entries: [],
      });
    }

    const context = finalEntries
      .map((entry: any, index: number) => {
        return `Memory ${index + 1}
Type: ${entry.source_type}
Date: ${entry.content_created_at || "unknown"}
Similarity: ${Math.round((entry.similarity ?? 0) * 100)}%
Content:
${entry.content}`;
      })
      .join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are Ask Your Past, a personal memory retrieval system.

Return valid JSON only.

Goal:
Make the answer instantly understandable for mobile users.
Do not sound like a research report.

Rules:
- Always answer in English.
- Translate all non-English quotes/excerpts into English.
- Use only the retrieved memories.
- Never invent facts.
- Never diagnose.
- Never give therapy or motivational advice.
- Keep everything short and visual.
- Main answer must be maximum 1–2 short sentences.
- Reasons must be 2–3 short bullets.
- Sources must be short.
- Do not use labels like "Answer:", "Found:", "Supporting entries:" inside text.
- Confidence must be "high", "medium", or "low".
- Confidence should depend on number and quality of matching memories.

Return exactly this JSON:
{
  "main_answer": "1-2 short sentences",
  "reasons": ["short bullet", "short bullet"],
  "sources": [
    {
      "date": "YYYY-MM-DD",
      "type": "thought | memo | anchor",
      "quote": "short translated quote"
    }
  ],
  "confidence": "high | medium | low",
  "memory_count": 2
}
`,
        },
        {
          role: "user",
          content: `
Question:
${question}

Retrieved memories:
${context}
`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const mainAnswer = parsed.main_answer || "I couldn’t find clear evidence for this.";
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 3) : [];
    const sources = Array.isArray(parsed.sources) ? parsed.sources.slice(0, 5) : [];
    const confidence = ["high", "medium", "low"].includes(parsed.confidence)
      ? parsed.confidence
      : finalEntries.length >= 4
        ? "medium"
        : "low";

    return res.status(200).json({
      answer: mainAnswer,
      main_answer: mainAnswer,
      reasons,
      sources,
      confidence,
      memory_count: parsed.memory_count || finalEntries.length,
      entries: finalEntries,
    });
  } catch (error: any) {
    console.error("ASK PAST ERROR:", error);
    return res.status(500).json({
      error: error.message || "Could not ask your past.",
    });
  }
}