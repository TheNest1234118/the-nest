import { supabase } from "@/lib/supabase";

export type AwardOrderStatus =
  | "locked"
  | "available"
  | "address_required"
  | "address_confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type QualifiedAwardDay = {
  id: string;
  local_date: string;
  timezone: string;
  quality_score: number;
  qualified_at: string;
};

export type DaysRememberedProgress = {
  signedIn: boolean;
  isPremium: boolean;

  timezone: string;

  currentStreak: number;
  longestStreak: number;
  totalQualifiedDays: number;
  paidPremiumMonths: number;

  lastQualifiedDate: string | null;
  streakStartedAt: string | null;

  qualifiedToday: boolean;

  awardUnlocked: boolean;
  awardOrderStatus: AwardOrderStatus;

  daysGoal: number;
  premiumMonthsGoal: number;

  daysRemaining: number;
  premiumMonthsRemaining: number;

  streakProgressPercent: number;
  premiumProgressPercent: number;

  recentQualifiedDays: QualifiedAwardDay[];
};

const DAYS_GOAL = 365;
const PREMIUM_MONTHS_GOAL = 12;

function clamp(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function getBrowserTimezone() {
  if (
    typeof Intl === "undefined" ||
    typeof Intl.DateTimeFormat !== "function"
  ) {
    return "Europe/Zurich";
  }

  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || "Europe/Zurich"
    );
  } catch {
    return "Europe/Zurich";
  }
}

export function getLocalDateKey(
  timezone: string,
  date = new Date()
) {
  try {
    const parts =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);

    const get = (type: string) =>
      parts.find(
        (part) => part.type === type
      )?.value || "";

    return `${get("year")}-${get(
      "month"
    )}-${get("day")}`;
  } catch {
    return date
      .toISOString()
      .slice(0, 10);
  }
}

function normalizeOrderStatus(
  value: unknown
): AwardOrderStatus {
  const validStatuses: AwardOrderStatus[] = [
    "locked",
    "available",
    "address_required",
    "address_confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  const status = String(
    value || "locked"
  ) as AwardOrderStatus;

  return validStatuses.includes(status)
    ? status
    : "locked";
}

function createEmptyProgress(
  signedIn: boolean,
  isPremium: boolean,
  timezone = getBrowserTimezone()
): DaysRememberedProgress {
  return {
    signedIn,
    isPremium,

    timezone,

    currentStreak: 0,
    longestStreak: 0,
    totalQualifiedDays: 0,
    paidPremiumMonths: 0,

    lastQualifiedDate: null,
    streakStartedAt: null,

    qualifiedToday: false,

    awardUnlocked: false,
    awardOrderStatus: "locked",

    daysGoal: DAYS_GOAL,
    premiumMonthsGoal:
      PREMIUM_MONTHS_GOAL,

    daysRemaining: DAYS_GOAL,
    premiumMonthsRemaining:
      PREMIUM_MONTHS_GOAL,

    streakProgressPercent: 0,
    premiumProgressPercent: 0,

    recentQualifiedDays: [],
  };
}

export async function loadDaysRememberedProgress(): Promise<DaysRememberedProgress> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createEmptyProgress(
      false,
      false
    );
  }

  const [
    profileResult,
    progressResult,
    qualifiedDaysResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "plan, subscription_status"
      )
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("award_progress")
      .select(
        `
          user_id,
          timezone,
          current_streak,
          longest_streak,
          total_qualified_days,
          paid_premium_months,
          last_qualified_date,
          streak_started_at,
          award_unlocked,
          award_order_status,
          created_at,
          updated_at
        `
      )
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("award_qualified_days")
      .select(
        `
          id,
          local_date,
          timezone,
          quality_score,
          qualified_at
        `
      )
      .eq("user_id", user.id)
      .order("local_date", {
        ascending: false,
      })
      .limit(31),
  ]);

  if (profileResult.error) {
    console.error(
      "Could not load Award Premium status:",
      profileResult.error
    );
  }

  if (progressResult.error) {
    console.error(
      "Could not load Award progress:",
      progressResult.error
    );
  }

  if (qualifiedDaysResult.error) {
    console.error(
      "Could not load qualified Award days:",
      qualifiedDaysResult.error
    );
  }

  const profile =
    profileResult.data;

  const subscriptionStatus =
    String(
      profile?.subscription_status || ""
    );

    const premiumStatuses = [
        "",
        "active",
        "trialing",
        "manual_supporter",
      ];
      
      const isPremium =
        profile?.plan === "supporter" &&
        premiumStatuses.includes(subscriptionStatus);
  const row =
    progressResult.data;

  const timezone = String(
    row?.timezone ||
      getBrowserTimezone()
  );

  const currentStreak = Math.max(
    0,
    Number(row?.current_streak || 0)
  );

  const longestStreak = Math.max(
    0,
    Number(row?.longest_streak || 0)
  );

  const totalQualifiedDays =
    Math.max(
      0,
      Number(
        row?.total_qualified_days || 0
      )
    );

  const paidPremiumMonths =
    Math.max(
      0,
      Number(
        row?.paid_premium_months || 0
      )
    );

  const recentQualifiedDays: QualifiedAwardDay[] =
    (qualifiedDaysResult.data || [])
      .map((day: any) => ({
        id: String(day.id),

        local_date: String(
          day.local_date
        ),

        timezone: String(
          day.timezone || timezone
        ),

        quality_score: Math.max(
          0,
          Math.min(
            100,
            Number(
              day.quality_score || 0
            )
          )
        ),

        qualified_at: String(
          day.qualified_at || ""
        ),
      }));

  const todayKey =
    getLocalDateKey(timezone);

  const qualifiedToday =
    recentQualifiedDays.some(
      (day) =>
        day.local_date === todayKey
    );

  const completedDays =
    Math.min(
      DAYS_GOAL,
      currentStreak
    );

  const completedMonths =
    Math.min(
      PREMIUM_MONTHS_GOAL,
      paidPremiumMonths
    );

  /*
   * Both requirements must be fulfilled.
   *
   * Do not trust only the database award_unlocked field,
   * because qualification requires both 365 consecutive
   * days and 12 successfully paid Premium months.
   */
  const awardUnlocked =
    currentStreak >= DAYS_GOAL &&
    paidPremiumMonths >=
      PREMIUM_MONTHS_GOAL;

  let awardOrderStatus =
    normalizeOrderStatus(
      row?.award_order_status
    );

  if (
    awardUnlocked &&
    awardOrderStatus === "locked"
  ) {
    awardOrderStatus = "available";
  }

  if (
    !awardUnlocked &&
    awardOrderStatus === "available"
  ) {
    awardOrderStatus = "locked";
  }

  return {
    signedIn: true,
    isPremium,

    timezone,

    currentStreak,
    longestStreak,
    totalQualifiedDays,
    paidPremiumMonths,

    lastQualifiedDate:
      row?.last_qualified_date || null,

    streakStartedAt:
      row?.streak_started_at || null,

    qualifiedToday,

    awardUnlocked,
    awardOrderStatus,

    daysGoal: DAYS_GOAL,

    premiumMonthsGoal:
      PREMIUM_MONTHS_GOAL,

    daysRemaining: Math.max(
      0,
      DAYS_GOAL - currentStreak
    ),

    premiumMonthsRemaining:
      Math.max(
        0,
        PREMIUM_MONTHS_GOAL -
          paidPremiumMonths
      ),

    streakProgressPercent:
      clamp(
        (
          completedDays /
          DAYS_GOAL
        ) * 100,
        0,
        100
      ),

    premiumProgressPercent:
      clamp(
        (
          completedMonths /
          PREMIUM_MONTHS_GOAL
        ) * 100,
        0,
        100
      ),

    recentQualifiedDays,
  };
}

export async function refreshDaysRememberedProgress() {
  return loadDaysRememberedProgress();
}