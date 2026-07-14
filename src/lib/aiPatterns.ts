import { supabase } from "@/lib/supabase";
import type {
  AIPatternGeneration,
  AIPatternTimeRange,
  LifeTheme,
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
  latestInsight:
    | AIPatternGeneration["result"]["patterns"][number]
    | null;
  lifeThemes: LifeTheme[];
  analysisState: AIPatternAnalysisState | null;
  lastCheckedAt: string | null;
  lastAnalyzedAt: string | null;
  hasUnseenInsights: boolean;
};

function mapGenerationRow(row: any): AIPatternGeneration {
  const result = row?.result || {};

  return {
    id: String(row.id),
    created_at: String(row.created_at),
    range: (row.range || "all") as AIPatternTimeRange,
    entry_count: Number(row.entry_count || 0),
    voice_count: Number(row.voice_count || 0),
    thought_count: Number(row.thought_count || 0),
    result: {
      summary: String(result.summary || ""),
      hero_themes: Array.isArray(result.hero_themes)
        ? result.hero_themes
        : [],
      patterns: Array.isArray(result.patterns)
        ? result.patterns
        : [],
      life_themes: Array.isArray(result.life_themes)
        ? result.life_themes
        : [],
    },
  };
}

function readLocalHistory(): AIPatternGeneration[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(mapGenerationRow);
  } catch {
    return [];
  }
}

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
      "Could not load The Nest Noticed history:",
      error
    );

    return [];
  }

  return (data || []).map(mapGenerationRow);
}

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
      "Could not load The Nest Noticed plan:",
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

export async function loadAIPatternAnalysisState(): Promise<AIPatternAnalysisState | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

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
      "Could not load The Nest Noticed analysis state:",
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

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

export async function markAIPatternsSeen(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  localStorage.setItem(
    getSeenStorageKey(user.id),
    new Date().toISOString()
  );
}

export async function getAIPatternsSeenAt(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    localStorage.getItem(
      getSeenStorageKey(user.id)
    ) || null
  );
}

function getLatestInsight(
  history: AIPatternGeneration[]
) {
  for (const generation of history) {
    const firstPattern =
      generation.result.patterns?.[0];

    if (firstPattern) {
      return firstPattern;
    }
  }

  return null;
}

function mergeLifeThemes(
  history: AIPatternGeneration[]
): LifeTheme[] {
  const byName = new Map<string, LifeTheme>();

  for (const generation of history) {
    const themes =
      generation.result.life_themes || [];

    for (const theme of themes) {
      const key = theme.name
        .trim()
        .toLowerCase();

      if (!key) {
        continue;
      }

      const existing = byName.get(key);

      if (!existing) {
        byName.set(key, {
          ...theme,
          supporting_entry_ids: [
            ...new Set(
              theme.supporting_entry_ids || []
            ),
          ],
        });

        continue;
      }

      const combinedIds = [
        ...new Set([
          ...(existing.supporting_entry_ids || []),
          ...(theme.supporting_entry_ids || []),
        ]),
      ];

      byName.set(key, {
        ...existing,
        mention_count: Math.max(
          existing.mention_count,
          theme.mention_count,
          combinedIds.length
        ),
        strength: Math.max(
          existing.strength,
          theme.strength
        ),
        direction: theme.direction,
        description:
          theme.description ||
          existing.description,
        supporting_entry_ids: combinedIds,
      });
    }
  }

  return [...byName.values()]
    .sort((a, b) => {
      if (b.strength !== a.strength) {
        return b.strength - a.strength;
      }

      return (
        b.mention_count -
        a.mention_count
      );
    })
    .slice(0, 8);
}

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
      latestInsight:
        getLatestInsight(localHistory),
      lifeThemes:
        mergeLifeThemes(localHistory),
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

  const latestInsight =
    getLatestInsight(history);

  const lifeThemes =
    mergeLifeThemes(history);

  const latestInsightDate =
    history.find(
      (generation) =>
        generation.result.patterns?.length > 0
    )?.created_at || null;

  const hasUnseenInsights = Boolean(
    latestInsightDate &&
      (!seenAt ||
        new Date(
          latestInsightDate
        ).getTime() >
          new Date(seenAt).getTime())
  );

  return {
    signedIn: true,
    isSupporter:
      planResult.isSupporter,
    status: planResult.isSupporter
      ? "active"
      : "locked",
    history,
    latestGeneration,
    latestInsight,
    lifeThemes,
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

export async function loadLatestAIPatternGeneration(): Promise<AIPatternGeneration | null> {
  const history =
    await loadAIPatternHistory(1);

  return history[0] || null;
}

/**
 * Temporary compatibility export.
 *
 * Automatic insight generation must only happen
 * through the background server job.
 */
export async function generateAIPatterns(
  _range: AIPatternTimeRange
): Promise<AIPatternGeneration> {
  throw new Error(
    "The Nest Noticed runs automatically in the background for Supporters."
  );
}