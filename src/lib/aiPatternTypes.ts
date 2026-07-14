export type AIPatternTimeRange =
  | "7d"
  | "30d"
  | "90d"
  | "all";

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
  | "recently_started"
  | "relationship_pattern"
  | "language_shift"
  | "confidence_change"
  | "priority_change";

export type AIPatternCategory =
  | "emotion"
  | "work"
  | "relationships"
  | "family"
  | "sleep"
  | "health"
  | "motivation"
  | "creativity"
  | "habits"
  | "identity"
  | "future"
  | "stress"
  | "confidence"
  | "language"
  | "priorities"
  | "other";

export type AIPatternChangeType =
  | "new_pattern"
  | "change"
  | "recurring_pattern"
  | "contrast"
  | "stopped_pattern";

export type AIPatternEvidence = {
  entry_id: string;
  entry_type:
    | "thought"
    | "voice"
    | "mood"
    | "reflection";
  date: string;
  title: string;
  quote: string;
  mood: string;
};

export type AIPattern = {
  id: string;

  /**
   * Human, calm headline.
   *
   * Example:
   * "Your future is showing up more often."
   */
  title: string;

  type: AIPatternType;
  category: AIPatternCategory;
  change_type: AIPatternChangeType;

  confidence: "medium" | "high";
  confidence_score: number;
  confidence_reason: string;

  /**
   * Main insight.
   *
   * This should remain concise and grounded.
   */
  description: string;

  /**
   * Actual supporting entries.
   */
  evidence: AIPatternEvidence[];

  /**
   * One quiet reflection question or small action.
   * It must not sound like therapy or coaching.
   */
  suggestion: string;
};

export type LifeTheme = {
  id: string;
  name: string;
  category: AIPatternCategory;

  /**
   * Number of supporting entries found.
   */
  mention_count: number;

  /**
   * 0–100 relevance score.
   */
  strength: number;

  /**
   * Indicates how the theme is changing.
   */
  direction:
    | "rising"
    | "falling"
    | "stable"
    | "new";

  /**
   * Short grounded explanation.
   */
  description: string;

  /**
   * IDs of entries supporting this theme.
   */
  supporting_entry_ids: string[];
};

export type AIPatternResponse = {
  /**
   * A short overall sentence.
   *
   * Example:
   * "Your recent entries are becoming more future-focused."
   */
  summary: string;

  /**
   * Short recurring themes for quick UI display.
   */
  hero_themes: string[];

  /**
   * Maximum three strong discoveries.
   */
  patterns: AIPattern[];

  /**
   * Optional structured Life Themes.
   */
  life_themes?: LifeTheme[];
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
  type:
    | "thought"
    | "voice"
    | "mood"
    | "reflection";

  title?: string;
  text?: string;
  transcript?: string;
  mood?: string;
  created_at: string;
};