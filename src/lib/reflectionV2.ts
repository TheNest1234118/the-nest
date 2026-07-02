import { loadThoughts } from "@/lib/userData";
import { loadMemos } from "@/lib/memos";
import type {
  ReflectionKind,
  ReflectionEntry,
  ReflectionV2Generation,
  ReflectionV2Result,
} from "@/lib/reflectionV2Types";

const KEY = "nest_reflection_v2_history";

function daysFor(kind: ReflectionKind) {
  return kind === "weekly" ? 7 : 31;
}

function inRange(date: string, kind: ReflectionKind) {
  const cutoff = Date.now() - daysFor(kind) * 86400000;
  return new Date(date).getTime() >= cutoff;
}

export function loadReflectionV2History(kind?: ReflectionKind) {
  const all: ReflectionV2Generation[] = JSON.parse(localStorage.getItem(KEY) || "[]");
  return kind ? all.filter((x) => x.kind === kind) : all;
}

function saveReflectionV2(item: ReflectionV2Generation) {
  const all = loadReflectionV2History();
  localStorage.setItem(KEY, JSON.stringify([item, ...all].slice(0, 40)));
}

export async function loadReflectionEntries(kind: ReflectionKind): Promise<ReflectionEntry[]> {
  const thoughts = await loadThoughts();
  const memos = await loadMemos();

  return [
    ...(thoughts || []).map((t: any) => ({
      id: t.id,
      type: "thought" as const,
      title: "Thought",
      text: t.text,
      created_at: t.created_at,
    })),
    ...(memos || []).map((m: any) => ({
      id: m.id,
      type: "voice" as const,
      title: m.title || "Voice capsule",
      text: m.transcript_text || m.title || "",
      created_at: m.created_at,
    })),
  ]
    .filter((e) => inRange(e.created_at, kind))
    .filter((e) => `${e.title || ""} ${e.text || ""}`.trim().length > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 120);
}

export async function generateReflectionV2(kind: ReflectionKind) {
  const entries = await loadReflectionEntries(kind);

  const voice_count = entries.filter((e) => e.type === "voice").length;
  const thought_count = entries.filter((e) => e.type === "thought").length;
  const mood_count = entries.filter((e) => e.type === "mood").length;

  if (entries.length < 3) {
    const empty: ReflectionV2Generation = {
      id: crypto.randomUUID(),
      kind,
      created_at: new Date().toISOString(),
      entry_count: entries.length,
      voice_count,
      thought_count,
      mood_count,
      result: {
        story: "",
        wins: [],
        challenges: [],
        emotional_journey: [],
        what_changed: [],
        moments: [],
        gentle_reflection: "",
        next_suggestion: "",
      },
    };
    return empty;
  }

  const res = await fetch("/api/reflection-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      entries,
      previous: loadReflectionV2History(kind)[0]?.result || null,
    }),
  });

  if (!res.ok) throw new Error("Could not generate reflection.");

  const result: ReflectionV2Result = await res.json();

  const generation: ReflectionV2Generation = {
    id: crypto.randomUUID(),
    kind,
    created_at: new Date().toISOString(),
    entry_count: entries.length,
    voice_count,
    thought_count,
    mood_count,
    result,
  };

  saveReflectionV2(generation);
  return generation;
}