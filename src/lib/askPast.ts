import { supabase } from "@/lib/supabase";

export type AskPastEntry = {
  id: string;
  source_type: "thought" | "anchor" | "memo";
  source_id: string;
  content: string;
  content_created_at: string | null;
  similarity: number;
};

export async function askPast(question: string): Promise<{
  answer: string;
  entries: AskPastEntry[];
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const res = await fetch("/api/ask-past", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ question }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Could not ask the past");
  }

  return json;
}

export async function embedMemoryFromClient(input: {
  sourceType: "thought" | "anchor" | "memo";
  sourceId: string;
  content: string;
  contentCreatedAt?: string | null;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return;

  await fetch("/api/embed-memory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });
}