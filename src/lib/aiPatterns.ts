import { supabase } from "@/lib/supabase";
import type {
  AIPatternGeneration,
  AIPatternTimeRange,
} from "@/lib/aiPatternTypes";

const STORAGE_KEY = "nest_ai_pattern_generations";
const SEEN_KEY_PREFIX = "nest_ai_patterns_seen_at";

export type AIPatternAutomationStatus =
  | "signed_out"
  | "locked"
  | "active";

export type AIPatternAnalysisState = {
  user_id: string;
  last_analyzed_at: string | null;
  last_checked_at: string | null;
  last_new_entry_count: number;
  last_new_word_count: number;
  updated_at: string | null;
};

export type AIPatternPageData = {
  signedIn: boolean;
  isSupporter: boolean;
  status: AIPatternAutomationStatus;
  history: AIPatternGeneration[];
  latestGeneration: AIPatternGeneration | null;
  analysisState: AIPatternAnalysisState | null;
  lastCheckedAt: string | null;
  lastAnalyzedAt: string | null;
  hasUnseenInsights: boolean;
};

/**
 * Converts one Supabase row into the structure used by the frontend.
 */
function mapGenerationRow(row: any): AIPatternGeneration {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    range: (row.range || "all") as AIPatternTimeRange,
    entry_count: Number(row.entry_count || 0),
    voice_count: Number(row.voice_count || 0),
    thought_count: Number(row.thought_count || 0),
    result: {
      summary: String(row.result?.summary || ""),
      hero_themes: Array.isArray(row.result?.hero_themes)
        ? row.result.hero_themes
        : [],
      patterns: Array.isArray(row.result?.patterns)
        ? row.result.patterns
        : [],
    },
  };
}

/**
 * Local fallback for older anonymous generations.
 *
 * Automatic AI Patterns only run for signed-in Supporters,
 * but keeping this fallback prevents old local data from disappearing.
 */
function readLocalHistory(): AIPatternGeneration[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(parsed)) return [];

    return parsed.map(mapGenerationRow);
  } catch {
    return [];
  }
}

/**
 * Loads previously generated AI Pattern folders.
 *
 * New generations are created by the automatic server job,
 * not by the browser.
 */
export async function loadAIPatternHistory(
  limit = 20
): Promise<AIPatternGeneration[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return readLocalHistory();
  }

  const safeLimit = Math.min(
    Math.max(limit, 1),
    50
  );

  const { data, error } = await supabase
    .from("ai_pattern_generations")
    .select(
      `
        id,
        created_at,
        range,
        entry_count,
        voice_count,
        thought_count,
        result
      `
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(safeLimit);

  if (error) {
    console.error(
      "Could not load AI Pattern history:",
      error
    );

    return [];
  }

  return (data || []).map(mapGenerationRow);
}

/**
 * Loads the user's plan.
 */
export async function loadAIPatternPlan(): Promise<{
  signedIn: boolean;
  isSupporter: boolean;
  plan: "free" | "supporter" | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      signedIn: false,
      isSupporter: false,
      plan: null,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Could not load AI Pattern plan:",
      error
    );

    return {
      signedIn: true,
      isSupporter: false,
      plan: "free",
    };
  }

  const plan =
    data?.plan === "supporter"
      ? "supporter"
      : "free";

  return {
    signedIn: true,
    isSupporter: plan === "supporter",
    plan,
  };
}

/**
 * Loads information from the automatic analysis state table.
 *
 * If RLS does not allow the client to read the row yet,
 * this safely returns null. The AI Pattern page can still work
 * using the latest saved generation.
 */
export async function loadAIPatternAnalysisState(): Promise<AIPatternAnalysisState | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_pattern_analysis_state")
    .select(
      `
        user_id,
        last_analyzed_at,
        last_checked_at,
        last_new_entry_count,
        last_new_word_count,
        updated_at
      `
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn(
      "Could not load AI Pattern analysis state:",
      error
    );

    return null;
  }

  if (!data) return null;

  return {
    user_id: String(data.user_id),
    last_analyzed_at:
      data.last_analyzed_at || null,
    last_checked_at:
      data.last_checked_at || null,
    last_new_entry_count: Number(
      data.last_new_entry_count || 0
    ),
    last_new_word_count: Number(
      data.last_new_word_count || 0
    ),
    updated_at: data.updated_at || null,
  };
}

function getSeenStorageKey(userId: string) {
  return `${SEEN_KEY_PREFIX}:${userId}`;
}

/**
 * Stores when the user last opened their AI Pattern page.
 *
 * This is only presentation state. It does not trigger analysis.
 */
export async function markAIPatternsSeen(): Promise<void> {
  if (typeof window === "undefined") return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  localStorage.setItem(
    getSeenStorageKey(user.id),
    new Date().toISOString()
  );
}

/**
 * Returns the last time the user viewed the AI Pattern page.
 */
export async function getAIPatternsSeenAt(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    localStorage.getItem(
      getSeenStorageKey(user.id)
    ) || null
  );
}

/**
 * Loads everything required by the new automatic AI Patterns page.
 */
export async function loadAIPatternPageData(): Promise<AIPatternPageData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const localHistory = readLocalHistory();

    return {
      signedIn: false,
      isSupporter: false,
      status: "signed_out",
      history: localHistory,
      latestGeneration:
        localHistory[0] || null,
      analysisState: null,
      lastCheckedAt: null,
      lastAnalyzedAt:
        localHistory[0]?.created_at || null,
      hasUnseenInsights: false,
    };
  }

  const [
    planResult,
    history,
    analysisState,
    seenAt,
  ] = await Promise.all([
    loadAIPatternPlan(),
    loadAIPatternHistory(),
    loadAIPatternAnalysisState(),
    getAIPatternsSeenAt(),
  ]);

  const latestGeneration =
    history[0] || null;

  const latestInsightDate =
    latestGeneration?.created_at || null;

  const hasUnseenInsights =
    Boolean(
      latestInsightDate &&
        (!seenAt ||
          new Date(
            latestInsightDate
          ).getTime() >
            new Date(seenAt).getTime())
    );

  return {
    signedIn: true,
    isSupporter: planResult.isSupporter,
    status: planResult.isSupporter
      ? "active"
      : "locked",
    history,
    latestGeneration,
    analysisState,
    lastCheckedAt:
      analysisState?.last_checked_at ||
      null,
    lastAnalyzedAt:
      analysisState?.last_analyzed_at ||
      latestGeneration?.created_at ||
      null,
    hasUnseenInsights,
  };
}

/**
 * Reloads the latest automatic generation.
 */
export async function loadLatestAIPatternGeneration(): Promise<AIPatternGeneration | null> {
  const history =
    await loadAIPatternHistory(1);

  return history[0] || null;
}

/**
 * Compatibility function.
 *
 * AI Pattern generation is now automatic and may no longer be
 * started manually from the browser.
 *
 * Keep this export temporarily so the old AIPatterns.tsx does not
 * fail to compile before you replace that page.
 */
export async function generateAIPatterns(
  _range: AIPatternTimeRange
): Promise<AIPatternGeneration> {
  throw new Error(
    "AI Patterns now run automatically in the background for Supporters."
  );
}