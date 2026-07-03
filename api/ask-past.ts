import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Please sign in first." });
    }

    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({ error: "Missing question" });
    }

    const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
    const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl) {
        return res.status(500).json({ error: "SUPABASE_URL missing" });
      }
      
      if (!anonKey) {
        return res.status(500).json({ error: "SUPABASE_ANON_KEY missing" });
      }
      
      if (!serviceKey) {
        return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" });
      }
      
      if (!openaiKey) {
        return res.status(500).json({ error: "OPENAI_API_KEY missing" });
      }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const openai = new OpenAI({ apiKey: openaiKey });
    const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();
  
  if (profile?.plan !== "supporter") {
    return res.status(403).json({
      error:
        "Ask Your Past uses AI processing and is included in the Supporter Plan.",
    });
  }
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    const queryEmbedding = embeddingResponse.data[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error("Could not create question embedding");
    }

    // 2. Supabase Vector Search: nur relevante Einträge holen
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

    const entries = matches || [];

    let finalEntries = entries;

    if (finalEntries.length === 0) {
      const { data: thoughts } = await supabase
        .from("thoughts")
        .select("id, text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
    
      const { data: anchors } = await supabase
        .from("anchors")
        .select("id, type, content, created_at")
        .eq("user_id", user.id)
        .eq("type", "text")
        .order("created_at", { ascending: false })
        .limit(10);
    
      const { data: memos } = await supabase
        .from("memos")
        .select("id, transcript_text, created_at")
        .eq("user_id", user.id)
        .not("transcript_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
    
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
        answer:
          "I couldn’t find any saved thoughts, text anchors, or voice transcripts yet.",
        entries: [],
      });
    }

    // 3. Nur diese Einträge an GPT schicken
    const context = finalEntries
      .map((entry: any, index: number) => {
        return [
          `Entry ${index + 1}`,
          `Type: ${entry.source_type}`,
          `Date: ${entry.content_created_at || "unknown"}`,
          `Entry ${index + 1}

Source: ${entry.source_type}

Date: ${entry.content_created_at}

Similarity: ${Math.round((entry.similarity ?? 0) * 100)}%

Content:
${entry.content}`,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    // 4. GPT formuliert Antwort
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        {
            role: "system",
            content: `
          You are Ask Your Past, a personal memory retrieval system.
          
          Your only job is to answer questions using the retrieved personal entries.
          
          Never use outside knowledge.
          
          Rules:
          - Always answer in the same language as the user's question.
- This applies to every language.
- Do not force English.
- Translate section labels like "Answer", "Found", "Supporting entries" and "Uncertainty" into the user's language.
          - Answer ONLY from the retrieved entries.
          - Never invent facts.
          - Never guess.
          - Never hallucinate.
          - Never diagnose.
          - Never provide emotional support.
          - Never provide therapy.
          - Never provide motivational advice.
          - Never end answers with suggestions like
            "If you'd like to reflect more..."
            "I'm here for you."
            "Let me know if..."
          - If the retrieved evidence is insufficient, explicitly say so.
          
          Your goal is to help the user find memories, not to behave like a therapist.
          
          Always use exactly this structure:
          
          Answer:
          A direct answer in 1–3 sentences.
          
          Found:
          Use bullet points.
          Mention concrete findings.
          Prefer:
          - counts
          - dates
          - source types
          - names
          - recurring patterns
          Only include findings supported by the retrieved entries.
          
          Supporting entries:
          List every retrieved entry you relied on.
          
          Each entry should contain:
          - source type
          - date
          - short excerpt (maximum 120 characters)
          
          Uncertainty:
          Include ONLY if the evidence is weak, incomplete or conflicting.
          
          Sensitive topics:
          
          The user may ask about:
          - drugs
          - alcohol
          - crime
          - relationships
          - health
          - sexuality
          - mental health
          - conflicts
          
          If those topics exist inside the retrieved entries,
          summarize them factually.
          
          Never refuse because a topic is sensitive.
          
          Do not provide instructions.
          Do not provide advice.
          Do not encourage harmful behaviour.
          If there is no evidence, say this in the same language as the user's question.
          
          Your personality:
          
          Precise.
          Grounded.
          Evidence-based.
          Minimal.
          You are a memory search engine, not a chatbot.
          Always answer in English.

Even if the user's question or the retrieved entries are written in another language,
your response must always be written in natural English.

You may translate short quotes from the user's entries into English when necessary,
while preserving their original meaning.
          `,
          },
        {
          role: "user",
          content: `
          Answer in the same language as the question.
          
          Question:
          ${question}
          
          Relevant saved entries:
          ${context}
          `,
        },
      ],
    });

    const answer =
    completion.choices[0]?.message?.content ||
    "I found related entries, but couldn’t form a clear answer.";

    return res.status(200).json({
      answer,
      entries: finalEntries,
    });
  } catch (error: any) {
    console.error("ASK PAST ERROR:", error);

    return res.status(500).json({
      error: error.message || "Could not ask your past.",
    });
  }
}