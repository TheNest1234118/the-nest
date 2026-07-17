export type MirrorCategory =
  | "confidence"
  | "future"
  | "work"
  | "relationships"
  | "family"
  | "identity"
  | "motivation"
  | "stress"
  | "growth"
  | "priorities"
  | "other";

export type MirrorResult = {
  title: string;
  past: string;
  present: string;
  reflection: string;

  past_entry_id: string;
  recent_entry_id: string;

  past_date: string;
  recent_date: string;

  confidence_score: number;
  category: MirrorCategory;
};

export type MirrorGeneration = {
  id: string;
  created_at: string;

  recent_entry_id: string;
  past_entry_id: string;

  recent_date: string;
  past_date: string;

  result: MirrorResult;
};

export type MirrorAnalysisState = {
  user_id: string;
  timezone: string;
  last_checked_at: string | null;
  last_generated_at: string | null;
  last_recent_entry_at: string | null;
  last_checked_local_date: string | null;
  updated_at: string | null;
};

export type MirrorPageData = {
  signedIn: boolean;
  isPremium: boolean;

  history: MirrorGeneration[];
  latest: MirrorGeneration | null;
  analysisState: MirrorAnalysisState | null;

  hasUnseenMirror: boolean;
};
