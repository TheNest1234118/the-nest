export type ReflectionKind = "weekly" | "monthly";

export type ReflectionEntry = {
  id: string;
  type: "thought" | "voice" | "mood";
  title?: string;
  text?: string;
  transcript?: string;
  mood?: string;
  note?: string;
  created_at: string;
};

export type ReflectionEmotionalDay = {
  day: string;
  has_entry: boolean;
  mood: string;
  emoji: string;
  note: string;
  chart_score: number | null;
};

export type ReflectionChange = {
  label: string;
  direction: "up" | "down" | "same";
  emoji: string;
  reason: string;
};

export type ReflectionMoment = {
  entry_id: string;
  date: string;
  quote: string;
  emoji: string;
};

export type DigestInsight = {
  title: string;
  explanation: string;
  supporting_entry_ids: string[];
};

export type ReflectionV2Result = {
  /**
   * Main Digest headline.
   *
   * Example:
   * "A week of uncertainty and small progress"
   */
  digest_title: string;

  /**
   * Narrative weekly or monthly chapter.
   * This is not supposed to read like a summary.
   */
  story: string;

  /**
   * The biggest meaningful shift in the period.
   */
  biggest_change: string;

  /**
   * One exact quote from the user's own entries.
   */
  quote_of_the_week: string;

  /**
   * One grounded observation that can connect
   * The Nest Digest with The Nest Noticed.
   */
  integrated_insight: DigestInsight | null;

  /**
   * Existing reflection fields kept for compatibility.
   */
  wins: string[];
  challenges: string[];
  emotional_journey: ReflectionEmotionalDay[];
  what_changed: ReflectionChange[];
  moments: ReflectionMoment[];

  gentle_reflection: string;
  next_suggestion: string;
  suggestions: string[];
  one_small_step: string;

  /**
   * Final narrative sentence shown at the end.
   */
  closing_sentence: string;

  /**
   * Optional monthly fields.
   */
  monthly_themes?: {
    title: string;
    importance: string;
    mentions: number;
    change: string;
  }[];

  month_growth?: {
    label: string;
    value: string;
  }[];
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
  result: ReflectionV2Result;
};