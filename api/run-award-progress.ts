import type {
    VercelRequest,
    VercelResponse,
  } from "@vercel/node";
  
  import {
    createClient,
  } from "@supabase/supabase-js";
  
  export const config = {
    maxDuration: 300,
  };
  
  type AwardProgressRow = {
    user_id: string;
    timezone: string | null;
    current_streak: number | null;
    longest_streak: number | null;
    total_qualified_days:
      | number
      | null;
    last_qualified_date:
      | string
      | null;
    award_unlocked:
      | boolean
      | null;
  };
  
  type ProcessingStats = {
    checked: number;
    reset: number;
    unchanged: number;
    skippedUnlocked: number;
    errors: Array<{
      userId: string;
      error: string;
    }>;
  };
  
  function getRequestSecret(
    req: VercelRequest
  ) {
    const querySecret =
      typeof req.query.secret ===
      "string"
        ? req.query.secret
        : "";
  
    const headerSecret =
      typeof req.headers[
        "x-cron-secret"
      ] === "string"
        ? req.headers[
            "x-cron-secret"
          ]
        : "";
  
    const authorization =
      typeof req.headers
        .authorization === "string"
        ? req.headers.authorization
        : "";
  
    return {
      querySecret,
      headerSecret,
      authorization,
    };
  }
  
  function isAuthorized(
    req: VercelRequest
  ) {
    const expected =
      process.env.CRON_SECRET;
  
    if (!expected) {
      return false;
    }
  
    const {
      querySecret,
      headerSecret,
      authorization,
    } = getRequestSecret(req);
  
    return (
      querySecret === expected ||
      headerSecret === expected ||
      authorization ===
        `Bearer ${expected}`
    );
  }
  
  function getLocalDateParts(
    timezone: string,
    date = new Date()
  ) {
    try {
      const parts =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }
        ).formatToParts(date);
  
      const get = (
        type: string
      ) =>
        parts.find(
          (part) =>
            part.type === type
        )?.value || "";
  
      return {
        year: Number(
          get("year")
        ),
        month: Number(
          get("month")
        ),
        day: Number(
          get("day")
        ),
      };
    } catch {
      const fallback =
        new Date();
  
      return {
        year:
          fallback.getUTCFullYear(),
        month:
          fallback.getUTCMonth() +
          1,
        day:
          fallback.getUTCDate(),
      };
    }
  }
  
  function datePartsToKey(parts: {
    year: number;
    month: number;
    day: number;
  }) {
    return [
      String(parts.year).padStart(
        4,
        "0"
      ),
  
      String(parts.month).padStart(
        2,
        "0"
      ),
  
      String(parts.day).padStart(
        2,
        "0"
      ),
    ].join("-");
  }
  
  function shiftDateKey(
    dateKey: string,
    days: number
  ) {
    const [
      year,
      month,
      day,
    ] = dateKey
      .split("-")
      .map(Number);
  
    const date = new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );
  
    date.setUTCDate(
      date.getUTCDate() + days
    );
  
    return date
      .toISOString()
      .slice(0, 10);
  }
  
  function getLocalCalendarKeys(
    timezone: string
  ) {
    const today =
      datePartsToKey(
        getLocalDateParts(
          timezone
        )
      );
  
    return {
      today,
      yesterday:
        shiftDateKey(today, -1),
    };
  }
  
  function isValidDateKey(
    value: string | null
  ) {
    return Boolean(
      value &&
        /^\d{4}-\d{2}-\d{2}$/.test(
          value
        )
    );
  }
  
  export default async function handler(
    req: VercelRequest,
    res: VercelResponse
  ) {
    if (
      req.method !== "GET" &&
      req.method !== "POST"
    ) {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }
  
    if (!isAuthorized(req)) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }
  
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env
        .VITE_SUPABASE_URL;
  
    const serviceKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;
  
    if (
      !supabaseUrl ||
      !serviceKey
    ) {
      return res.status(500).json({
        error:
          "Missing Supabase environment variables",
      });
    }
  
    const supabase =
      createClient(
        supabaseUrl,
        serviceKey
      );
  
    const stats: ProcessingStats = {
      checked: 0,
      reset: 0,
      unchanged: 0,
      skippedUnlocked: 0,
      errors: [],
    };
  
    try {
      /*
       * Only rows with an existing streak need daily checking.
       * limit() keeps one execution safely bounded.
       */
      const {
        data: progressRows,
        error: progressError,
      } = await supabase
        .from("award_progress")
        .select(
          `
            user_id,
            timezone,
            current_streak,
            longest_streak,
            total_qualified_days,
            last_qualified_date,
            award_unlocked
          `
        )
        .gt("current_streak", 0)
        .order("updated_at", {
          ascending: true,
        })
        .limit(1000);
  
      if (progressError) {
        throw progressError;
      }
  
      for (
        const row of
          (progressRows ||
            []) as AwardProgressRow[]
      ) {
        stats.checked += 1;
  
        try {
          const userId =
            String(row.user_id);
  
          /*
           * Completed journeys should no longer be reset.
           */
          if (
            row.award_unlocked ===
            true
          ) {
            stats.skippedUnlocked +=
              1;
            continue;
          }
  
          const timezone =
            String(
              row.timezone ||
                "Europe/Zurich"
            );
  
          const {
            today,
            yesterday,
          } =
            getLocalCalendarKeys(
              timezone
            );
  
          const lastQualifiedDate =
            row.last_qualified_date
              ? String(
                  row.last_qualified_date
                )
              : null;
  
          /*
           * During the current local day, yesterday remains valid.
           *
           * Example:
           * - Monday qualified
           * - Tuesday is still in progress
           * - Do not reset on Tuesday
           *
           * At Wednesday 00:xx:
           * - Monday is older than yesterday
           * - Tuesday was missed
           * - Reset the streak
           */
          const shouldReset =
            !isValidDateKey(
              lastQualifiedDate
            ) ||
            (
              lastQualifiedDate !==
                today &&
              lastQualifiedDate !==
                yesterday &&
              lastQualifiedDate! <
                yesterday
            );
  
          if (!shouldReset) {
            stats.unchanged += 1;
            continue;
          }
  
          const previousStreak =
            Math.max(
              0,
              Number(
                row.current_streak ||
                  0
              )
            );
  
          const {
            error: resetError,
          } = await supabase
            .from(
              "award_progress"
            )
            .update({
              current_streak: 0,
              streak_started_at:
                null,
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "user_id",
              userId
            );
  
          if (resetError) {
            throw resetError;
          }
  
          const {
            error: auditError,
          } = await supabase
            .from(
              "award_audit_log"
            )
            .insert({
              user_id: userId,
              memo_id: null,
              event_type:
                "streak_reset",
  
              details: {
                reason:
                  "No qualifying Voice Reflection was recorded during the previous local calendar day.",
  
                timezone,
                checked_local_date:
                  today,
  
                required_date:
                  yesterday,
  
                last_qualified_date:
                  lastQualifiedDate,
  
                previous_streak:
                  previousStreak,
              },
            });
  
          if (auditError) {
            console.error(
              "AWARD STREAK AUDIT ERROR:",
              auditError
            );
          }
  
          stats.reset += 1;
        } catch (userError: any) {
          console.error(
            "AWARD PROGRESS USER ERROR:",
            row.user_id,
            userError
          );
  
          stats.errors.push({
            userId:
              String(row.user_id),
  
            error:
              userError.message ||
              "Unknown progress error",
          });
        }
      }
  
      return res.status(200).json({
        ok: true,
        processedAt:
          new Date()
            .toISOString(),
        stats,
      });
    } catch (error: any) {
      console.error(
        "RUN AWARD PROGRESS ERROR:",
        error
      );
  
      return res.status(500).json({
        ok: false,
        error:
          error.message ||
          "Could not update award progress.",
        stats,
      });
    }
  }