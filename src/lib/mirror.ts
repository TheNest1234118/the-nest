import { supabase } from "@/lib/supabase";

import type {
    MirrorAnalysisState,
    MirrorGeneration,
    MirrorPageData,
    MirrorResult,
  } from "@/lib/mirrorTypes";

const SEEN_KEY_PREFIX =
  "nest_mirror_seen_at";

function normalizeResult(value: any): MirrorResult {
  return {
    title: String(value?.title || ""),
    past: String(value?.past || ""),
    present: String(value?.present || ""),
    reflection: String(value?.reflection || ""),

    past_entry_id: String(
      value?.past_entry_id || ""
    ),

    recent_entry_id: String(
      value?.recent_entry_id || ""
    ),

    past_date: String(
      value?.past_date || ""
    ),

    recent_date: String(
      value?.recent_date || ""
    ),

    confidence_score: Math.max(
      0,
      Math.min(
        100,
        Number(value?.confidence_score || 0)
      )
    ),

    category: [
      "confidence",
      "future",
      "work",
      "relationships",
      "family",
      "identity",
      "motivation",
      "stress",
      "growth",
      "priorities",
      "other",
    ].includes(String(value?.category))
      ? value.category
      : "other",
  };
}

function normalizeGeneration(
  row: any
): MirrorGeneration {
  return {
    id: String(row.id),
    created_at: String(row.created_at),

    recent_entry_id: String(
      row.recent_entry_id
    ),

    past_entry_id: String(
      row.past_entry_id
    ),

    recent_date: String(
      row.recent_date
    ),

    past_date: String(
      row.past_date
    ),

    result: normalizeResult(row.result),
  };
}

function isPremiumProfile(
  plan: unknown,
  status: unknown
) {
  if (String(plan || "") !== "supporter") {
    return false;
  }

  return [
    "",
    "active",
    "trialing",
    "manual_supporter",
  ].includes(String(status || ""));
}

function seenKey(userId: string) {
  return `${SEEN_KEY_PREFIX}:${userId}`;
}

export async function loadMirrorHistory(
  limit = 20
): Promise<MirrorGeneration[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const safeLimit = Math.min(
    50,
    Math.max(1, limit)
  );

  const { data, error } = await supabase
    .from("mirror_generations")
    .select(
      `
        id,
        created_at,
        recent_entry_id,
        past_entry_id,
        recent_date,
        past_date,
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
      "Could not load Mirror history:",
      error
    );

    return [];
  }

  return (data || []).map(
    normalizeGeneration
  );
}

export async function loadMirrorAnalysisState(): Promise<MirrorAnalysisState | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("mirror_analysis_state")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Could not load Mirror state:",
      error
    );

    return null;
  }

  if (!data) return null;

  return {
    user_id: String(data.user_id),
    timezone: String(
      data.timezone || "Europe/Zurich"
    ),
    last_checked_at:
      data.last_checked_at || null,
    last_generated_at:
      data.last_generated_at || null,
    last_recent_entry_at:
      data.last_recent_entry_at || null,
    last_checked_local_date:
      data.last_checked_local_date || null,
    updated_at:
      data.updated_at || null,
  };
}

export async function markMirrorSeen() {
  if (typeof window === "undefined") return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  localStorage.setItem(
    seenKey(user.id),
    new Date().toISOString()
  );
}

export async function loadMirrorPageData(): Promise<MirrorPageData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      signedIn: false,
      isPremium: false,
      history: [],
      latest: null,
      analysisState: null,
      hasUnseenMirror: false,
    };
  }

  const [
    profileResult,
    history,
    analysisState,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "plan, subscription_status"
      )
      .eq("user_id", user.id)
      .maybeSingle(),

    loadMirrorHistory(),

    loadMirrorAnalysisState(),
  ]);

  if (profileResult.error) {
    console.error(
      "Could not load Mirror Premium status:",
      profileResult.error
    );
  }

  const isPremium =
    isPremiumProfile(
      profileResult.data?.plan,
      profileResult.data
        ?.subscription_status
    );

  const latest =
    history[0] || null;

  const seenAt =
    typeof window !== "undefined"
      ? localStorage.getItem(
          seenKey(user.id)
        )
      : null;

  const hasUnseenMirror = Boolean(
    latest?.created_at &&
      (
        !seenAt ||
        new Date(
          latest.created_at
        ).getTime() >
          new Date(seenAt).getTime()
      )
  );

  return {
    signedIn: true,
    isPremium,
    history,
    latest,
    analysisState,
    hasUnseenMirror,
  };
}
