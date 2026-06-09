import { supabase } from "@/lib/supabase";

export type MoodKey =
  | "calm"
  | "good"
  | "neutral"
  | "overstimulated"
  | "anxious"
  | "sad";

export async function saveDailyMood(mood: MoodKey) {
  const today = new Date().toISOString().slice(0, 10);

  localStorage.setItem("nest_mood_today", mood);
  localStorage.setItem("nest_mood_date", today);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("user_daily_mood").upsert(
    {
      user_id: user.id,
      mood,
      mood_date: today,
    },
    { onConflict: "user_id,mood_date" }
  );
}

export async function loadMoodContinuity() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("user_daily_mood")
      .select("mood, mood_date")
      .eq("user_id", user.id)
      .in("mood_date", [today, yesterdayDate]);

    const todayMood = data?.find((m) => m.mood_date === today)?.mood ?? null;
    const yesterdayMood =
      data?.find((m) => m.mood_date === yesterdayDate)?.mood ?? null;

    return { todayMood, yesterdayMood };
  }

  const localDate = localStorage.getItem("nest_mood_date");
  const localMood = localStorage.getItem("nest_mood_today");

  return {
    todayMood: localDate === today ? localMood : null,
    yesterdayMood: localDate === yesterdayDate ? localMood : null,
  };
}

export async function saveDailyIntention(intention: string) {
  const today = new Date().toISOString().slice(0, 10);

  localStorage.setItem("nest_daily_intention", intention);
  localStorage.setItem("nest_daily_intention_date", today);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("daily_intentions").upsert(
    {
      user_id: user.id,
      intention,
      intention_date: today,
      completed: false,
    },
    { onConflict: "user_id,intention_date" }
  );
}

export async function completeDailyIntention() {
  const today = new Date().toISOString().slice(0, 10);

  localStorage.setItem("nest_daily_intention_completed", today);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("daily_intentions")
    .update({ completed: true })
    .eq("user_id", user.id)
    .eq("intention_date", today);
}
export async function loadMoodLog() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_daily_mood")
    .select("id, mood, mood_date, created_at")
    .eq("user_id", user.id)
    .order("mood_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}