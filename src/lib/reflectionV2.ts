import { loadThoughts } from "@/lib/userData";
import { loadMemos } from "@/lib/memos";
import { supabase } from "@/lib/supabase";
import { loadMoodLog } from "@/lib/dailyNest";
import type { ReflectionKind, ReflectionV2Generation } from "@/lib/reflectionV2Types";

const STORAGE_KEY = "nest_reflection_v2_history";

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay() || 7;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

function inRange(date: string, start: Date, end: Date) {
  const d = new Date(date);
  return d >= start && d < end;
}

export async function loadReflectionV2History(kind: ReflectionKind) {
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("reflection_v2_generations")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("kind", kind)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

async function saveReflectionV2(item: ReflectionV2Generation) {
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return;

  await supabase.from("reflection_v2_generations").insert({
    id: item.id,
    user_id: auth.user.id,
    kind: item.kind,
    created_at: item.created_at,
    range_start: item.range_start,
    range_end: item.range_end,
    voice_count: item.voice_count,
    thought_count: item.thought_count,
    mood_count: item.mood_count,
    result: item.result,
  });
}

export async function generateReflectionV2(
  kind: ReflectionKind
): Promise<ReflectionV2Generation> {
  const { start, end } = getCurrentWeekRange();

  const thoughts = await loadThoughts();
  const memos = await loadMemos();
  const moods = await loadMoodLog();

  const weekThoughts = (thoughts || []).filter((x: any) =>
    inRange(x.created_at, start, end)
  );

  const weekMemos = (memos || []).filter((x: any) =>
    inRange(x.created_at, start, end)
  );

  const weekMoods = (moods || []).filter((x: any) =>
    inRange(x.mood_date || x.created_at, start, end)
  );

  const entries = [
    ...weekThoughts.map((x: any) => ({
      type: "thought",
      id: x.id,
      date: x.created_at,
      text: x.text,
    })),
    ...weekMemos.map((x: any) => ({
      type: "voice",
      id: x.id,
      date: x.created_at,
      title: x.title,
      transcript: x.transcript_text || "",
    })),
    ...weekMoods.map((x: any) => ({
      type: "mood",
      id: x.id,
      date: x.mood_date || x.created_at,
      mood: x.mood,
      note: x.note || "",
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const generation: ReflectionV2Generation = {
    id: crypto.randomUUID(),
    kind,
    created_at: new Date().toISOString(),
    range_start: start.toISOString(),
    range_end: end.toISOString(),
    voice_count: weekMemos.length,
    thought_count: weekThoughts.length,
    mood_count: weekMoods.length,
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

  if (entries.length < 3) {
    saveReflectionV2(generation);
    return generation;
  }

  const res = await fetch("/api/reflection-v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind,
      range_start: start.toISOString(),
      range_end: end.toISOString(),
      entries,
    }),
  });

  if (!res.ok) {
    throw new Error("Could not generate reflection.");
  }

  const result = await res.json();

  const finalItem: ReflectionV2Generation = {
    ...generation,
    result,
  };

  saveReflectionV2(finalItem);
  return finalItem;
}