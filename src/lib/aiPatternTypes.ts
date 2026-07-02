export type AIPatternTimeRange = "7d" | "30d" | "90d" | "all";

export type AIPatternType =
  | "recurring_topic"
  | "emotional_pattern"
  | "creative_pattern"
  | "stress_pattern"
  | "growth_pattern"
  | "avoidance_pattern"
  | "habit_pattern"
  | "time_of_day_pattern"
  | "positive_change"
  | "negative_loop"
  | "stopped_mentioning"
  | "recently_started";

export type AIPatternEvidence = {
  entry_id: string;
  entry_type: "thought" | "voice" | "mood" | "reflection";
  date: string;
  title: string;
  quote: string;
  mood: string;
};

export type AIPattern = {
  id: string;
  title: string;
  type: AIPatternType;
  confidence: "low" | "medium" | "high";
  confidence_reason: string;
  description: string;
  evidence: AIPatternEvidence[];
  suggestion: string;
};

export type AIPatternResponse = {
  summary: string;
  hero_themes: string[];
  patterns: AIPattern[];
};

export type AIPatternGeneration = {
  id: string;
  created_at: string;
  range: AIPatternTimeRange;
  entry_count: number;
  voice_count: number;
  thought_count: number;
  result: AIPatternResponse;
};

export type PatternEntry = {
  id: string;
  type: "thought" | "voice" | "mood" | "reflection";
  title?: string;
  text?: string;
  transcript?: string;
  mood?: string;
  created_at: string;
};