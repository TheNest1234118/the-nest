export type ReflectionKind = "weekly" | "monthly";

export type ReflectionEntry = {
  id: string;
  type: "thought" | "voice" | "mood";
  title?: string;
  text?: string;
  mood?: string;
  created_at: string;
};

export type ReflectionV2Result = {
  story: string;
  wins: string[];
  challenges: string[];
  emotional_journey: { day: string; mood: string; note: string }[];
  what_changed: { label: string; direction: "up" | "down" | "same" }[];
  moments: { entry_id: string; date: string; quote: string }[];
  gentle_reflection: string;
  next_suggestion: string;

  monthly_themes?: {
    title: string;
    importance: string;
    mentions: number;
    change: string;
  }[];
  month_growth?: { label: string; value: string }[];
  closing_sentence?: string;
};

export type ReflectionV2Generation = {
  id: string;
  kind: ReflectionKind;
  created_at: string;
  range_start?: string;
  range_end?: string;
  voice_count: number;
  thought_count: number;
  mood_count: number;
  result: any;
};