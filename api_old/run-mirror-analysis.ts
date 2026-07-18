import type {
    VercelRequest,
    VercelResponse,
  } from "@vercel/node";
  
  import {
    createClient,
    type SupabaseClient,
  } from "@supabase/supabase-js";
  
  import { createHash } from "node:crypto";
  
  import {
    generateMirrorComparison,
    type MirrorInputEntry,
  } from "./generate-mirror.js";
  
  export const config = {
    maxDuration: 300,
  };
  
  type JobStats = {
    checked: number;
    generated: number;
    skipped: number;
    pushesSent: number;
    errors: Array<{
      userId: string;
      error: string;
    }>;
  };
  
  function isAuthorized(req: VercelRequest) {
    const expected = process.env.CRON_SECRET;
  
    if (!expected) return false;
  
    const authorization =
      typeof req.headers.authorization === "string"
        ? req.headers.authorization
        : "";
  
    const headerSecret =
      typeof req.headers["x-cron-secret"] === "string"
        ? req.headers["x-cron-secret"]
        : "";
  
    const querySecret =
      typeof req.query.secret === "string"
        ? req.query.secret
        : "";
  
    return (
      authorization === `Bearer ${expected}` ||
      headerSecret === expected ||
      querySecret === expected
    );
  }
  
  function localNow(timezone: string) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
  
      const get = (type: string) =>
        parts.find((part) => part.type === type)?.value || "";
  
      return {
        date: `${get("year")}-${get("month")}-${get("day")}`,
        hour: Number(get("hour")),
      };
    } catch {
      const now = new Date();
  
      return {
        date: now.toISOString().slice(0, 10),
        hour: now.getUTCHours(),
      };
    }
  }
  
  function fingerprint(
    userId: string,
    recentEntryId: string,
    pastEntryId: string,
    title: string
  ) {
    return createHash("sha256")
      .update(
        [
          userId,
          recentEntryId,
          pastEntryId,
          title.trim().toLowerCase(),
        ].join("|")
      )
      .digest("hex");
  }
  
  async function getTimezone(
    supabase: SupabaseClient,
    userId: string
  ) {
    const { data: notification } = await supabase
      .from("notification_preferences")
      .select("reminder_timezone")
      .eq("user_id", userId)
      .not("reminder_timezone", "is", null)
      .limit(1)
      .maybeSingle();
  
    if (notification?.reminder_timezone) {
      return String(notification.reminder_timezone);
    }
  
    const { data: state } = await supabase
      .from("mirror_analysis_state")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
  
    return String(state?.timezone || "Europe/Zurich");
  }
  
  async function sendMirrorPush({
    appId,
    apiKey,
    subscriptionIds,
  }: {
    appId: string;
    apiKey: string;
    subscriptionIds: string[];
  }) {
    const ids = [...new Set(subscriptionIds.filter(Boolean))];
  
    if (ids.length === 0) return false;
  
    const response = await fetch(
      "https://api.onesignal.com/notifications",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: appId,
          include_subscription_ids: ids,
          headings: {
            en: "🪞 Your Mirror found a change",
          },
          contents: {
            en: "The way you speak about something has changed.",
          },
          url:
            "https://www.thenestapp.space/insights/mirror?notification=mirror",
        }),
      }
    );
  
    if (!response.ok) {
      console.error(
        "MIRROR PUSH ERROR:",
        response.status,
        await response.text()
      );
  
      return false;
    }
  
    return true;
  }
  
  export default async function handler(
    req: VercelRequest,
    res: VercelResponse
  ) {
    if (req.method !== "GET" && req.method !== "POST") {
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
      process.env.VITE_SUPABASE_URL;
  
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;
  
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: "Missing Supabase environment variables",
      });
    }
  
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY missing",
      });
    }
  
    const force =
      req.query.force === "true" ||
      req.body?.force === true;
      const backfill =
      req.query.backfill === "true" ||
      req.body?.backfill === true;
    const supabase = createClient(
      supabaseUrl,
      serviceKey
    );
  
    const stats: JobStats = {
      checked: 0,
      generated: 0,
      skipped: 0,
      pushesSent: 0,
      errors: [],
    };
  
    try {
      const { data: profiles, error: profileError } =
        await supabase
          .from("profiles")
          .select("user_id, plan, subscription_status")
          .eq("plan", "supporter")
          .limit(200);
  
      if (profileError) throw profileError;
  
      for (const profile of profiles || []) {
        const userId = String(profile.user_id);
        stats.checked += 1;
  
        try {
          const premiumStatuses = [
            "",
            "active",
            "trialing",
            "manual_supporter",
          ];
  
          if (
            !premiumStatuses.includes(
              String(profile.subscription_status || "")
            )
          ) {
            stats.skipped += 1;
            continue;
          }
  
          const timezone = await getTimezone(
            supabase,
            userId
          );
  
          const local = localNow(timezone);
  
          const { data: state, error: stateError } =
            await supabase
              .from("mirror_analysis_state")
              .select("*")
              .eq("user_id", userId)
              .maybeSingle();
  
          if (stateError) throw stateError;
  
          /*
           * Call this endpoint hourly.
           * It only performs the daily analysis around 03:00 local time.
           * force=true bypasses this during testing.
           */
          if (
            !force &&
            (
              local.hour !== 3 ||
              state?.last_checked_local_date === local.date
            )
          ) {
            stats.skipped += 1;
            continue;
          }
  
          const recentStart =
          backfill
            ? new Date(
                Date.now() - 730 * 24 * 60 * 60 * 1000
              ).toISOString()
            : state?.last_recent_entry_at ||
              new Date(
                Date.now() - 14 * 24 * 60 * 60 * 1000
              ).toISOString();
  
          const oldCutoff = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString();
  
          const oldStart = new Date(
            Date.now() - 730 * 24 * 60 * 60 * 1000
          ).toISOString();
  
          const [
            recentResult,
            pastResult,
            previousResult,
          ] = await Promise.all([
            supabase
              .from("memos")
              .select("id, title, transcript_text, created_at")
              .eq("user_id", userId)
              .gt("created_at", recentStart)
              .not("transcript_text", "is", null)
              .order("created_at", {
                ascending: false,
              })
              .limit(backfill ? 100 : 40),
  
            supabase
              .from("memos")
              .select("id, title, transcript_text, created_at")
              .eq("user_id", userId)
              .gte("created_at", oldStart)
              .lte("created_at", oldCutoff)
              .not("transcript_text", "is", null)
              .order("created_at", {
                ascending: false,
              })
              .limit(40),
  
            supabase
              .from("mirror_generations")
              .select("result")
              .eq("user_id", userId)
              .order("created_at", {
                ascending: false,
              })
              .limit(20),
          ]);
  
          if (recentResult.error) throw recentResult.error;
          if (pastResult.error) throw pastResult.error;
          if (previousResult.error) throw previousResult.error;
  
          const recentEntries: MirrorInputEntry[] =
            (recentResult.data || [])
              .map((memo: any) => ({
                id: String(memo.id),
                title: String(memo.title || "Voice Capsule"),
                transcript: String(memo.transcript_text || "").trim(),
                created_at: String(memo.created_at),
              }))
              .filter((entry) => entry.transcript.length >= 20);
  
          const pastEntries: MirrorInputEntry[] =
            (pastResult.data || [])
              .map((memo: any) => ({
                id: String(memo.id),
                title: String(memo.title || "Voice Capsule"),
                transcript: String(memo.transcript_text || "").trim(),
                created_at: String(memo.created_at),
              }))
              .filter((entry) => entry.transcript.length >= 20);
  
          const latestRecentDate =
            recentEntries[0]?.created_at || null;
  
          if (
            recentEntries.length === 0 ||
            pastEntries.length === 0
          ) {
            await supabase
              .from("mirror_analysis_state")
              .upsert(
                {
                  user_id: userId,
                  timezone,
                  last_checked_at: new Date().toISOString(),
                  last_checked_local_date: local.date,
                  last_recent_entry_at:
                    latestRecentDate ||
                    state?.last_recent_entry_at ||
                    null,
                },
                {
                  onConflict: "user_id",
                }
              );
  
            stats.skipped += 1;
            continue;
          }
  
          const previousMirrors =
            (previousResult.data || []).map(
              (row: any) => ({
                title: String(row.result?.title || ""),
                reflection: String(row.result?.reflection || ""),
                past_entry_id: String(
                  row.result?.past_entry_id || ""
                ),
                recent_entry_id: String(
                  row.result?.recent_entry_id || ""
                ),
              })
            );
  
          const generated =
            await generateMirrorComparison({
              recentEntries,
              pastEntries,
              previousMirrors,
            });
  
          await supabase
            .from("mirror_analysis_state")
            .upsert(
              {
                user_id: userId,
                timezone,
                last_checked_at: new Date().toISOString(),
                last_checked_local_date: local.date,
                last_recent_entry_at: latestRecentDate,
                last_generated_at: generated.found
                  ? new Date().toISOString()
                  : state?.last_generated_at || null,
              },
              {
                onConflict: "user_id",
              }
            );
  
          if (!generated.found) {
            stats.skipped += 1;
            continue;
          }
  
          const resultFingerprint = fingerprint(
            userId,
            generated.recent_entry_id,
            generated.past_entry_id,
            generated.title
          );
  
          const {
            error: insertError,
          } = await supabase
            .from("mirror_generations")
            .insert({
              user_id: userId,
              recent_entry_id:
                generated.recent_entry_id,
              past_entry_id:
                generated.past_entry_id,
              recent_date: generated.recent_date,
              past_date: generated.past_date,
              fingerprint: resultFingerprint,
              result: {
                title: generated.title,
                past: generated.past,
                present: generated.present,
                reflection: generated.reflection,
                past_entry_id:
                  generated.past_entry_id,
                recent_entry_id:
                  generated.recent_entry_id,
                past_date: generated.past_date,
                recent_date: generated.recent_date,
                confidence_score:
                  generated.confidence_score,
                category: generated.category,
              },
            });
  
          if (insertError) {
            if (insertError.code === "23505") {
              stats.skipped += 1;
              continue;
            }
  
            throw insertError;
          }
  
          stats.generated += 1;
  
          const appId =
            process.env.ONESIGNAL_APP_ID;
  
          const apiKey =
            process.env.ONESIGNAL_REST_API_KEY;
  
          if (appId && apiKey) {
            const {
              data: preferences,
            } = await supabase
              .from("notification_preferences")
              .select("onesignal_subscription_id")
              .eq("user_id", userId)
              .eq("enabled", true)
              .not("onesignal_subscription_id", "is", null);
  
            const sent = await sendMirrorPush({
              appId,
              apiKey,
              subscriptionIds:
                (preferences || []).map(
                  (item: any) =>
                    String(
                      item.onesignal_subscription_id || ""
                    )
                ),
            });
  
            if (sent) stats.pushesSent += 1;
          }
        } catch (error: any) {
          console.error(
            "MIRROR USER ANALYSIS ERROR:",
            userId,
            error
          );
  
          stats.errors.push({
            userId,
            error:
              error.message ||
              "Unknown Mirror analysis error",
          });
        }
      }
  
      return res.status(200).json({
        ok: true,
        stats,
      });
    } catch (error: any) {
      console.error(
        "RUN MIRROR ANALYSIS ERROR:",
        error
      );
  
      return res.status(500).json({
        ok: false,
        error:
          error.message ||
          "Mirror analysis failed.",
        stats,
      });
    }
  }
  