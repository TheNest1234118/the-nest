import type {
    VercelRequest,
    VercelResponse,
  } from "@vercel/node";
  import { createClient } from "@supabase/supabase-js";
  import { analyzePatterns } from "./ai-patterns.js";
  
  export const config = {
    maxDuration: 300,
  };
  
  type NewEntry = {
    id: string;
    type: "thought" | "voice";
    title: string;
    text?: string;
    transcript?: string;
    mood: string;
    created_at: string;
  };
  
  type AnalysisStats = {
    checked: number;
    analyzed: number;
    skipped: number;
    insightsCreated: number;
    pushesSent: number;
    errors: Array<{
      userId: string;
      error: string;
    }>;
  };
  
  function getSecretFromRequest(
    req: VercelRequest
  ) {
    const authorization =
      typeof req.headers.authorization === "string"
        ? req.headers.authorization
        : "";
  
    const querySecret =
      typeof req.query.secret === "string"
        ? req.query.secret
        : "";
  
    const headerSecret =
      typeof req.headers["x-cron-secret"] === "string"
        ? req.headers["x-cron-secret"]
        : "";
  
    return {
      authorization,
      querySecret,
      headerSecret,
    };
  }
  
  function isAuthorized(req: VercelRequest) {
    const expected = process.env.CRON_SECRET;
  
    if (!expected) return false;
  
    const {
      authorization,
      querySecret,
      headerSecret,
    } = getSecretFromRequest(req);
  
    return (
      authorization === `Bearer ${expected}` ||
      querySecret === expected ||
      headerSecret === expected
    );
  }
  
  function getEntryText(entry: NewEntry) {
    return String(
      entry.transcript ||
        entry.text ||
        entry.title ||
        ""
    ).trim();
  }
  
  function countWords(entries: NewEntry[]) {
    return entries.reduce((total, entry) => {
      const content = getEntryText(entry);
  
      if (!content) return total;
  
      return (
        total +
        content
          .split(/\s+/)
          .filter(Boolean).length
      );
    }, 0);
  }
  
  function latestEntryDate(entries: NewEntry[]) {
    if (entries.length === 0) {
      return new Date().toISOString();
    }
  
    return entries.reduce((latest, entry) => {
      const current = new Date(
        entry.created_at
      ).getTime();
  
      return current > latest
        ? current
        : latest;
    }, 0);
  }
  
  async function sendInsightPush({
    appId,
    apiKey,
    subscriptionIds,
  }: {
    appId: string;
    apiKey: string;
    subscriptionIds: string[];
  }) {
    const uniqueSubscriptionIds = [
      ...new Set(subscriptionIds.filter(Boolean)),
    ];
  
    if (uniqueSubscriptionIds.length === 0) {
      return {
        sent: false,
        reason: "No subscriptions",
      };
    }
  
    const payload = {
      app_id: appId,
      include_subscription_ids:
        uniqueSubscriptionIds,
      headings: {
        en: "✨ New insight found",
      },
      contents: {
        en: "The Nest noticed something meaningful in your recent entries.",
      },
      url: "https://www.thenestapp.space/insights/ai-patterns",
    };
  
    const response = await fetch(
      "https://api.onesignal.com/notifications",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  
    const raw = await response.text();
  
    let responseData: any = raw;
  
    try {
      responseData = JSON.parse(raw);
    } catch {
      // Leave response as text.
    }
  
    if (!response.ok) {
      console.error(
        "ONESIGNAL AI PATTERN PUSH ERROR:",
        response.status,
        responseData
      );
  
      return {
        sent: false,
        reason: "OneSignal error",
        response: responseData,
      };
    }
  
    return {
      sent: true,
      response: responseData,
    };
  }
  
  export default async function handler(
    req: VercelRequest,
    res: VercelResponse
  ) {
    if (
      req.method !== "GET" &&
      req.method !== "POST"
    ) {
      return res
        .status(405)
        .json({ error: "Method not allowed" });
    }
  
    if (!isAuthorized(req)) {
      return res
        .status(401)
        .json({ error: "Unauthorized" });
    }
  
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL;
  
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;
  
    const oneSignalAppId =
      process.env.ONESIGNAL_APP_ID;
  
    const oneSignalApiKey =
      process.env.ONESIGNAL_REST_API_KEY;
  
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: "Supabase environment variables missing",
      });
    }
  
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY missing",
      });
    }
  
    const supabase = createClient(
      supabaseUrl,
      serviceKey
    );
  
    const stats: AnalysisStats = {
      checked: 0,
      analyzed: 0,
      skipped: 0,
      insightsCreated: 0,
      pushesSent: 0,
      errors: [],
    };
  
    try {
      /*
       * Limit prevents one cron execution from becoming
       * too large. Increase later when needed.
       */
      const { data: supporters, error: profileError } =
        await supabase
          .from("profiles")
          .select("user_id, plan")
          .eq("plan", "supporter")
          .limit(200);
  
      if (profileError) {
        throw profileError;
      }
  
      for (const profile of supporters || []) {
        const userId = profile.user_id;
  
        stats.checked += 1;
  
        try {
          const {
            data: analysisState,
            error: stateError,
          } = await supabase
            .from("ai_pattern_analysis_state")
            .select(
              "user_id, last_analyzed_at, last_checked_at"
            )
            .eq("user_id", userId)
            .maybeSingle();
  
          if (stateError) {
            throw stateError;
          }
  
          /*
           * First automatic analysis:
           * look back 30 days.
           *
           * Later analyses:
           * only fetch entries after last_analyzed_at.
           */
          const fallbackStart = new Date(
            Date.now() -
              30 * 24 * 60 * 60 * 1000
          ).toISOString();
  
          const analysisStart =
            analysisState?.last_analyzed_at ||
            fallbackStart;
  
          const [
            thoughtsResult,
            memosResult,
          ] = await Promise.all([
            supabase
              .from("thoughts")
              .select(
                "id, text, created_at"
              )
              .eq("user_id", userId)
              .gt("created_at", analysisStart)
              .order("created_at", {
                ascending: true,
              })
              .limit(100),
  
            supabase
              .from("memos")
              .select(
                "id, title, transcript_text, created_at"
              )
              .eq("user_id", userId)
              .gt("created_at", analysisStart)
              .not(
                "transcript_text",
                "is",
                null
              )
              .order("created_at", {
                ascending: true,
              })
              .limit(100),
          ]);
  
          if (thoughtsResult.error) {
            throw thoughtsResult.error;
          }
  
          if (memosResult.error) {
            throw memosResult.error;
          }
  
          const newEntries: NewEntry[] = [
            ...(thoughtsResult.data || []).map(
              (thought: any) => ({
                id: String(thought.id),
                type: "thought" as const,
                title: "Thought",
                text: String(
                  thought.text || ""
                ),
                transcript: "",
                mood: "",
                created_at:
                  thought.created_at,
              })
            ),
  
            ...(memosResult.data || []).map(
              (memo: any) => ({
                id: String(memo.id),
                type: "voice" as const,
                title: String(
                  memo.title ||
                    "Voice capsule"
                ),
                text: "",
                transcript: String(
                  memo.transcript_text || ""
                ),
                mood: "",
                created_at:
                  memo.created_at,
              })
            ),
          ]
            .filter((entry) =>
              Boolean(getEntryText(entry))
            )
            .sort(
              (a, b) =>
                new Date(
                  a.created_at
                ).getTime() -
                new Date(
                  b.created_at
                ).getTime()
            );
  
          const wordCount =
            countWords(newEntries);
  
          const hasEnoughNewContent =
            newEntries.length >= 3 ||
            wordCount >= 500;
  
          if (!hasEnoughNewContent) {
            stats.skipped += 1;
  
            await supabase
              .from(
                "ai_pattern_analysis_state"
              )
              .upsert(
                {
                  user_id: userId,
                  last_checked_at:
                    new Date().toISOString(),
                  last_new_entry_count:
                    newEntries.length,
                  last_new_word_count:
                    wordCount,
                  updated_at:
                    new Date().toISOString(),
                },
                {
                  onConflict: "user_id",
                }
              );
  
            continue;
          }
  
          /*
           * Older entries are used only as comparison.
           * We load entries from before analysisStart,
           * going back up to 90 days.
           */
          const comparisonStart = new Date(
            new Date(
              analysisStart
            ).getTime() -
              90 * 24 * 60 * 60 * 1000
          ).toISOString();
  
          const [
            olderThoughtsResult,
            olderMemosResult,
            generationsResult,
          ] = await Promise.all([
            supabase
              .from("thoughts")
              .select(
                "id, text, created_at"
              )
              .eq("user_id", userId)
              .gte(
                "created_at",
                comparisonStart
              )
              .lte(
                "created_at",
                analysisStart
              )
              .order("created_at", {
                ascending: false,
              })
              .limit(50),
  
            supabase
              .from("memos")
              .select(
                "id, title, transcript_text, created_at"
              )
              .eq("user_id", userId)
              .gte(
                "created_at",
                comparisonStart
              )
              .lte(
                "created_at",
                analysisStart
              )
              .not(
                "transcript_text",
                "is",
                null
              )
              .order("created_at", {
                ascending: false,
              })
              .limit(50),
  
            supabase
              .from(
                "ai_pattern_generations"
              )
              .select(
                "id, result, created_at"
              )
              .eq("user_id", userId)
              .order("created_at", {
                ascending: false,
              })
              .limit(10),
          ]);
  
          if (olderThoughtsResult.error) {
            throw olderThoughtsResult.error;
          }
  
          if (olderMemosResult.error) {
            throw olderMemosResult.error;
          }
  
          if (generationsResult.error) {
            throw generationsResult.error;
          }
  
          const comparisonEntries = [
            ...(
              olderThoughtsResult.data || []
            ).map((thought: any) => ({
              id: String(thought.id),
              type: "thought" as const,
              title: "Thought",
              text: String(
                thought.text || ""
              ),
              transcript: "",
              mood: "",
              created_at:
                thought.created_at,
            })),
  
            ...(
              olderMemosResult.data || []
            ).map((memo: any) => ({
              id: String(memo.id),
              type: "voice" as const,
              title: String(
                memo.title ||
                  "Voice capsule"
              ),
              text: "",
              transcript: String(
                memo.transcript_text || ""
              ),
              mood: "",
              created_at:
                memo.created_at,
            })),
          ].filter((entry) =>
            Boolean(getEntryText(entry))
          );
  
          const previousInsights = (
            generationsResult.data || []
          ).flatMap((generation: any) => {
            const patterns =
              generation?.result?.patterns;
  
            if (!Array.isArray(patterns)) {
              return [];
            }
  
            return patterns.map(
              (pattern: any) => ({
                title: String(
                  pattern.title || ""
                ),
                description: String(
                  pattern.description || ""
                ),
                category: String(
                  pattern.category || ""
                ),
                type: String(
                  pattern.type || ""
                ),
              })
            );
          });
  
          const result =
            await analyzePatterns({
              newEntries,
              comparisonEntries,
              previousInsights,
            });
  
          const processedThrough =
            new Date(
              latestEntryDate(newEntries)
            ).toISOString();
  
          /*
           * Mark content as analyzed even when zero patterns
           * are returned. Otherwise the same entries would be
           * charged and analyzed every night.
           */
          await supabase
            .from(
              "ai_pattern_analysis_state"
            )
            .upsert(
              {
                user_id: userId,
                last_analyzed_at:
                  processedThrough,
                last_checked_at:
                  new Date().toISOString(),
                last_new_entry_count:
                  newEntries.length,
                last_new_word_count:
                  wordCount,
                updated_at:
                  new Date().toISOString(),
              },
              {
                onConflict: "user_id",
              }
            );
  
          stats.analyzed += 1;
  
          if (
            !Array.isArray(result.patterns) ||
            result.patterns.length === 0
          ) {
            continue;
          }
  
          const voiceCount =
            newEntries.filter(
              (entry) =>
                entry.type === "voice"
            ).length;
  
          const thoughtCount =
            newEntries.filter(
              (entry) =>
                entry.type === "thought"
            ).length;
  
          const generationId =
            crypto.randomUUID();
  
          const {
            error: generationError,
          } = await supabase
            .from(
              "ai_pattern_generations"
            )
            .insert({
              id: generationId,
              user_id: userId,
              created_at:
                new Date().toISOString(),
  
              /*
               * Keep "all" so it remains compatible
               * with your existing TypeScript type.
               */
              range: "all",
              entry_count:
                newEntries.length,
              voice_count: voiceCount,
              thought_count:
                thoughtCount,
              result,
            });
  
          if (generationError) {
            throw generationError;
          }
  
          stats.insightsCreated +=
            result.patterns.length;
  
          /*
           * Push only when new insights were saved.
           */
          if (
            oneSignalAppId &&
            oneSignalApiKey
          ) {
            const {
              data: notificationPreferences,
              error:
                notificationPreferencesError,
            } = await supabase
              .from(
                "notification_preferences"
              )
              .select(
                "onesignal_subscription_id"
              )
              .eq("user_id", userId)
              .eq("enabled", true)
              .not(
                "onesignal_subscription_id",
                "is",
                null
              );
  
            if (
              notificationPreferencesError
            ) {
              console.error(
                "Could not load push subscriptions:",
                notificationPreferencesError
              );
            } else {
              const subscriptionIds = (
                notificationPreferences || []
              )
                .map(
                  (preference: any) =>
                    preference.onesignal_subscription_id
                )
                .filter(Boolean);
  
              const pushResult =
                await sendInsightPush({
                  appId:
                    oneSignalAppId,
                  apiKey:
                    oneSignalApiKey,
                  subscriptionIds,
                });
  
              if (pushResult.sent) {
                stats.pushesSent += 1;
              }
            }
          }
        } catch (error: any) {
          console.error(
            "AI PATTERN USER ERROR:",
            userId,
            error
          );
  
          stats.errors.push({
            userId,
            error:
              error.message ||
              "Unknown user analysis error",
          });
        }
      }
  
      return res.status(200).json({
        ok: true,
        stats,
      });
    } catch (error: any) {
      console.error(
        "RUN AI PATTERN ANALYSIS ERROR:",
        error
      );
  
      return res.status(500).json({
        ok: false,
        error:
          error.message ||
          "Automatic analysis failed",
        stats,
      });
    }
  }