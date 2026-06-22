import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const config = {
  maxDuration: 60,
};

export async function embedMemory(input: {
  userId: string;
  sourceType: "thought" | "anchor" | "memo";
  sourceId: string;
  content: string;
  contentCreatedAt?: string | null;
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    throw new Error("Missing env vars");
  }

  const content = input.content?.trim();

  if (!content) {
    return { skipped: "empty content" };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiKey });

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content,
  });

  const embedding = embeddingResponse.data[0]?.embedding;

  if (!embedding) {
    throw new Error("Could not create embedding");
  }

  const { data, error } = await supabase
    .from("memory_embeddings")
    .upsert(
      {
        user_id: input.userId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        content,
        content_created_at: input.contentCreatedAt || new Date().toISOString(),
        embedding,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,source_type,source_id",
      }
    )
    .select()
    .single();

  if (error) throw error;

  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return res.status(500).json({ error: "Missing Supabase env vars" });
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

    const { sourceType, sourceId, content, contentCreatedAt } = req.body || {};

    if (!sourceType || !sourceId || !content) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await embedMemory({
      userId: user.id,
      sourceType,
      sourceId,
      content,
      contentCreatedAt,
    });

    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    console.error("EMBED MEMORY ERROR:", error);
    return res.status(500).json({
      error: error.message || "Embedding failed",
    });
  }
}