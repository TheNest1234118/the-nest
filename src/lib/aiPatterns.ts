import { loadThoughts } from "@/lib/userData";
import { loadMemos } from "@/lib/memos";
import { loadReflections } from "@/lib/reflections";
import type {
  AIPatternResponse,
  AIPatternTimeRange,
  PatternEntry,
} from "@/lib/aiPatternTypes";

function withinRange(date: string, range: AIPatternTimeRange) {
  if (range === "all") return true;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const created = new Date(date).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return created >= cutoff;
}

export async function loadPatternEntries(
  range: AIPatternTimeRange
): Promise<PatternEntry[]> {
  const entries: PatternEntry[] = [];

  try {
    const thoughts = await loadThoughts();

    for (const thought of thoughts || []) {
      if (!withinRange(thought.created_at, range)) continue;

      entries.push({
        id: thought.id,
        type: "thought",
        text: thought.text,
        created_at: thought.created_at,
      });
    }
  } catch (err) {
    console.error("Could not load thoughts for AI Patterns", err);
  }

  try {
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
  } catch (err) {
    console.error("Could not load memos for AI Patterns", err);
  }

  try {
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
  } catch (err) {
    console.error("Could not load reflections for AI Patterns", err);
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
): Promise<AIPatternResponse> {
  const entries = await loadPatternEntries(range);

  if (entries.length < 3) {
    return {
      summary: "",
      patterns: [],
    };
  }

  const res = await fetch("/api/ai-patterns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range,
      entries,
    }),
  });

  if (!res.ok) {
    throw new Error("Could not generate AI Patterns.");
  }

  return res.json();
}