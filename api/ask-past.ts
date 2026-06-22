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

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey || !openaiKey) {
      return res.status(500).json({ error: "Missing env vars" });
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

    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({ error: "Missing question" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    const queryEmbedding = embeddingResponse.data[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error("Could not create query embedding");
    }

    const { data: matches, error: matchError } = await supabase.rpc(
      "match_memory_embeddings",
      {
        query_embedding: queryEmbedding,
        match_user_id: user.id,
        match_count: 8,
        match_threshold: 0.2,
      }
    );

    if (matchError) throw matchError;

    const entries = matches || [];

    if (entries.length === 0) {
      return res.status(200).json({
        answer:
          "I couldn’t find anything close enough in your saved thoughts, anchors, or voice transcripts yet.",
        entries: [],
      });
    }

    const context = entries
      .map((entry: any, index: number) => {
        return [
          `Entry ${index + 1}`,
          `Type: ${entry.source_type}`,
          `Date: ${entry.content_created_at || "unknown"}`,
          `Content: ${entry.content}`,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You answer questions using only the user's retrieved personal entries. Be gentle, clear, and honest. If the entries do not support an answer, say that.",
        },
        {
          role: "user",
          content: `Question:\n${question}\n\nRelevant entries:\n${context}`,
        },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content ||
      "I found some related entries, but couldn’t form an answer.";

    return res.status(200).json({
      answer,
      entries,
    });
  } catch (error: any) {
    console.error("ASK PAST ERROR:", error);
    return res.status(500).json({
      error: error.message || "Could not ask the past",
    });
  }
}