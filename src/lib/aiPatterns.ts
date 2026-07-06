import { loadThoughts } from "@/lib/userData";
import { loadMemos } from "@/lib/memos";
import { loadReflections } from "@/lib/reflections";
import { supabase } from "@/lib/supabase";
import type {
  AIPatternGeneration,
  AIPatternResponse,
  AIPatternTimeRange,
  PatternEntry,
} from "@/lib/aiPatternTypes";

const STORAGE_KEY = "nest_ai_pattern_generations";

function withinRange(date: string, range: AIPatternTimeRange) {
  if (range === "all") return true;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const created = new Date(date).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return created >= cutoff;
}

export async function loadAIPatternHistory(): Promise<AIPatternGeneration[]> {
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  const { data, error } = await supabase
    .from("ai_pattern_generations")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Could not load AI pattern history", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    range: row.range,
    entry_count: row.entry_count,
    voice_count: row.voice_count,
    thought_count: row.thought_count,
    result: row.result,
  }));
}
export async function saveAIPatternGeneration(
  generation: AIPatternGeneration
): Promise<AIPatternGeneration[]> {
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const next = [generation, ...existing].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  const { error } = await supabase.from("ai_pattern_generations").insert({
    id: generation.id,
    user_id: auth.user.id,
    created_at: generation.created_at,
    range: generation.range,
    entry_count: generation.entry_count,
    voice_count: generation.voice_count,
    thought_count: generation.thought_count,
    result: generation.result,
  });

  if (error) {
    console.error("Could not save AI pattern generation", error);
  }

  return loadAIPatternHistory();
}

export async function loadPatternEntries(
  range: AIPatternTimeRange
): Promise<PatternEntry[]> {
  const entries: PatternEntry[] = [];

  const thoughts = await loadThoughts();
  for (const thought of thoughts || []) {
    if (!withinRange(thought.created_at, range)) continue;

    entries.push({
      id: thought.id,
      type: "thought",
      title: "Thought",
      text: thought.text,
      created_at: thought.created_at,
    });
  }

  const memos = await loadMemos();
  for (const memo of memos || []) {
    if (!withinRange(memo.created_at, range)) continue;

    entries.push({
      id: memo.id,
      type: "voice",
      title: memo.title || "Voice capsule",
      transcript: memo.transcript_text || "",
      created_at: memo.created_at,
    });
  }

  const reflections = await loadReflections();
  for (const reflection of reflections || []) {
    if (!withinRange(reflection.created_at, range)) continue;

    entries.push({
      id: reflection.id,
      type: "reflection",
      title: reflection.type,
      text: reflection.summary || "",
      created_at: reflection.created_at,
    });
  }

  return entries
    .filter((entry) => {
      const content = `${entry.title || ""} ${entry.text || ""} ${entry.transcript || ""}`;
      return content.trim().length > 0;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 100);
}

export async function generateAIPatterns(
  range: AIPatternTimeRange
): Promise<AIPatternGeneration> {
  const entries = await loadPatternEntries(range);

  const thoughtCount = entries.filter((entry) => entry.type === "thought").length;
  const voiceCount = entries.filter((entry) => entry.type === "voice").length;
  

  if (entries.length < 4) {
    return {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      range,
      entry_count: entries.length,
      voice_count: voiceCount,
      thought_count: thoughtCount,
      result: {
        summary: "",
        hero_themes: [],
        patterns: [],
      },
    };
  }

  const previousGeneration = (await loadAIPatternHistory())[0];

  const res = await fetch("/api/ai-patterns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range,
      entries,
      previousGeneration: previousGeneration?.result || null,
    }),
  });

  if (!res.ok) {
    throw new Error("Could not generate AI Patterns.");
  }

  const result: AIPatternResponse = await res.json();

  const generation: AIPatternGeneration = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    range,
    entry_count: entries.length,
    voice_count: voiceCount,
    thought_count: thoughtCount,
    result,
  };

  await saveAIPatternGeneration(generation);

  return generation;
}