import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import OpenAI, {
  toFile,
} from "openai";

import {
  createHash,
} from "node:crypto";

import {
  embedMemory,
} from "./embed-memory.js";

import {
  evaluateAwardReflection,
  type AwardReflectionEvaluation,
} from "./evaluate-award-reflection.js";

export const config = {
  maxDuration: 300,
};

type AwardProcessingResult = {
  evaluated: boolean;
  qualified: boolean;
  countedToday: boolean;
  reason: string | null;
  qualityScore: number | null;
};

function getMemoId(payload: any) {
  return (
    payload?.record?.id ||
    payload?.new?.id ||
    payload?.old_record?.id ||
    payload?.old?.id ||
    payload?.id ||
    null
  );
}

function hashTranscript(
  transcript: string
) {
  return createHash("sha256")
    .update(
      transcript
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
    )
    .digest("hex");
}

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getLocalDateKey(
  timezone: string
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
      ).formatToParts(
        new Date()
      );

    const value = (
      type: string
    ) =>
      parts.find(
        (part) =>
          part.type === type
      )?.value || "";

    return `${value("year")}-${value(
      "month"
    )}-${value("day")}`;
  } catch {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }
}

async function getUserTimezone(
  supabase: SupabaseClient,
  userId: string
) {
  /*
   * Prefer the timezone already collected for notifications.
   */
  const {
    data: notificationPreference,
  } = await supabase
    .from(
      "notification_preferences"
    )
    .select(
      "reminder_timezone"
    )
    .eq("user_id", userId)
    .not(
      "reminder_timezone",
      "is",
      null
    )
    .limit(1)
    .maybeSingle();

  if (
    notificationPreference
      ?.reminder_timezone
  ) {
    return String(
      notificationPreference
        .reminder_timezone
    );
  }

  const {
    data: awardProgress,
  } = await supabase
    .from("award_progress")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (awardProgress?.timezone) {
    return String(
      awardProgress.timezone
    );
  }

  return "Europe/Zurich";
}

async function addAuditLog(
  supabase: SupabaseClient,
  input: {
    userId: string;
    memoId: string;
    eventType: string;
    details?: Record<
      string,
      unknown
    >;
  }
) {
  const { error } = await supabase
    .from("award_audit_log")
    .insert({
      user_id: input.userId,
      memo_id: input.memoId,
      event_type:
        input.eventType,
      details:
        input.details || {},
    });

  if (error) {
    console.error(
      "AWARD AUDIT LOG ERROR:",
      error
    );
  }
}

async function loadRecentTranscripts(
  supabase: SupabaseClient,
  userId: string,
  memoId: string
) {
  const { data, error } =
    await supabase
      .from("memos")
      .select(
        "transcript_text"
      )
      .eq("user_id", userId)
      .neq("id", memoId)
      .not(
        "transcript_text",
        "is",
        null
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(5);

  if (error) {
    console.error(
      "RECENT TRANSCRIPTS ERROR:",
      error
    );

    return [];
  }

  return (data || [])
    .map((row: any) =>
      String(
        row.transcript_text || ""
      ).trim()
    )
    .filter(Boolean);
}

async function processAwardEvaluation({
  supabase,
  memo,
  transcript,
  plan,
  subscriptionStatus,
}: {
  supabase: SupabaseClient;
  memo: any;
  transcript: string;
  plan: string;
  subscriptionStatus:
    | string
    | null;
}): Promise<AwardProcessingResult> {
  const premiumActive =
    plan === "supporter" &&
    (
      !subscriptionStatus ||
      subscriptionStatus ===
        "active" ||
      subscriptionStatus ===
        "trialing"
    );

  /*
   * Award qualification is a Premium feature.
   * Free recordings are not sent through a second AI request.
   */
  if (!premiumActive) {
    return {
      evaluated: false,
      qualified: false,
      countedToday: false,
      reason:
        "Premium was not active when this recording was processed.",
      qualityScore: null,
    };
  }

  const cleanTranscript =
    transcript.trim();

  const transcriptHash =
    hashTranscript(
      cleanTranscript
    );

  const wordCount =
    countWords(cleanTranscript);

  /*
   * Exact duplicate transcripts never qualify twice.
   */
  const {
    data: duplicateEvaluation,
  } = await supabase
    .from(
      "award_memo_evaluations"
    )
    .select(
      "id, memo_id"
    )
    .eq(
      "user_id",
      memo.user_id
    )
    .eq(
      "transcript_hash",
      transcriptHash
    )
    .neq("memo_id", memo.id)
    .limit(1)
    .maybeSingle();

  let evaluation:
    AwardReflectionEvaluation;

  if (duplicateEvaluation) {
    evaluation = {
      qualified: false,
      quality_score: 0,
      reflection_score: 0,
      personal_content_score: 0,
      coherence_score: 0,
      originality_score: 0,
      spam_score: 100,
      reason:
        "This recording repeats a previously evaluated reflection.",
    };
  } else {
    const previousRecentTranscripts =
      await loadRecentTranscripts(
        supabase,
        memo.user_id,
        memo.id
      );

    evaluation =
      await evaluateAwardReflection({
        transcript:
          cleanTranscript,

        durationSeconds: Number(
          memo.duration || 0
        ),

        previousRecentTranscripts,
      });
  }

  const {
    data: savedEvaluation,
    error: evaluationError,
  } = await supabase
    .from(
      "award_memo_evaluations"
    )
    .upsert(
      {
        user_id:
          memo.user_id,

        memo_id:
          memo.id,

        qualified:
          evaluation.qualified,

        quality_score:
          evaluation.quality_score,

        reflection_score:
          evaluation.reflection_score,

        personal_content_score:
          evaluation.personal_content_score,

        coherence_score:
          evaluation.coherence_score,

        originality_score:
          evaluation.originality_score,

        spam_score:
          evaluation.spam_score,

        transcript_word_count:
          wordCount,

        duration_seconds:
          Math.max(
            0,
            Math.round(
              Number(
                memo.duration || 0
              )
            )
          ),

        reason:
          evaluation.reason,

        model:
          "gpt-4o-mini",

        transcript_hash:
          transcriptHash,

        evaluated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "memo_id",
      }
    )
    .select("id")
    .single();

  if (
    evaluationError ||
    !savedEvaluation
  ) {
    throw (
      evaluationError ||
      new Error(
        "Could not save award evaluation."
      )
    );
  }

  await addAuditLog(
    supabase,
    {
      userId: memo.user_id,
      memoId: memo.id,
      eventType:
        evaluation.qualified
          ? "memo_qualified"
          : "memo_rejected",

      details: {
        evaluation_id:
          savedEvaluation.id,

        quality_score:
          evaluation.quality_score,

        reflection_score:
          evaluation.reflection_score,

        personal_content_score:
          evaluation.personal_content_score,

        coherence_score:
          evaluation.coherence_score,

        originality_score:
          evaluation.originality_score,

        spam_score:
          evaluation.spam_score,

        reason:
          evaluation.reason,

        transcript_word_count:
          wordCount,

        duration_seconds:
          Number(
            memo.duration || 0
          ),
      },
    }
  );

  if (!evaluation.qualified) {
    return {
      evaluated: true,
      qualified: false,
      countedToday: false,
      reason:
        evaluation.reason,
      qualityScore:
        evaluation.quality_score,
    };
  }

  const timezone =
    await getUserTimezone(
      supabase,
      memo.user_id
    );

  const localDate =
    getLocalDateKey(
      timezone
    );

  /*
   * Maximum one qualifying day per user and local calendar date.
   */
  const {
    data: existingDay,
    error: existingDayError,
  } = await supabase
    .from(
      "award_qualified_days"
    )
    .select(
      "id, qualifying_memo_id"
    )
    .eq(
      "user_id",
      memo.user_id
    )
    .eq(
      "local_date",
      localDate
    )
    .maybeSingle();

  if (existingDayError) {
    throw existingDayError;
  }

  let countedToday = false;

  if (!existingDay) {
    const {
      error: dayInsertError,
    } = await supabase
      .from(
        "award_qualified_days"
      )
      .insert({
        user_id:
          memo.user_id,

        local_date:
          localDate,

        timezone,

        qualifying_memo_id:
          memo.id,

        evaluation_id:
          savedEvaluation.id,

        quality_score:
          evaluation.quality_score,

        premium_active: true,

        qualified_at:
          new Date().toISOString(),
      });

    if (dayInsertError) {
      /*
       * A simultaneous request may have inserted today's day first.
       * Unique violation 23505 is safe to ignore.
       */
      if (
        dayInsertError.code !==
        "23505"
      ) {
        throw dayInsertError;
      }
    } else {
      countedToday = true;
    }
  }

  const {
    error: progressError,
  } = await supabase.rpc(
    "recalculate_award_progress",
    {
      p_user_id:
        memo.user_id,
    }
  );

  if (progressError) {
    throw progressError;
  }

  await addAuditLog(
    supabase,
    {
      userId: memo.user_id,
      memoId: memo.id,
      eventType:
        countedToday
          ? "qualified_day_added"
          : "qualified_day_already_exists",

      details: {
        local_date:
          localDate,
        timezone,
        quality_score:
          evaluation.quality_score,
      },
    }
  );

  return {
    evaluated: true,
    qualified: true,
    countedToday,
    reason:
      evaluation.reason,
    qualityScore:
      evaluation.quality_score,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const webhookSecret =
    req.headers[
      "x-webhook-secret"
    ];

  if (
    webhookSecret !==
    process.env
      .TRANSCRIBE_WEBHOOK_SECRET
  ) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  const memoId =
    getMemoId(req.body);

  if (!memoId) {
    console.log(
      "TRANSCRIBE PAYLOAD:",
      JSON.stringify(req.body)
    );

    return res.status(400).json({
      error: "Missing memo id",
    });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env
      .VITE_SUPABASE_URL;

  const serviceKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  const openaiKey =
    process.env.OPENAI_API_KEY;

  if (
    !supabaseUrl ||
    !serviceKey ||
    !openaiKey
  ) {
    return res.status(500).json({
      error: "Missing env vars",
    });
  }

  const supabase = createClient(
    supabaseUrl,
    serviceKey
  );

  const openai = new OpenAI({
    apiKey: openaiKey,
  });

  const forceRetry =
    req.body?.forceRetry === true;

  console.log(
    "TRANSCRIBE START",
    {
      memoId,
      forceRetry,
    }
  );

  try {
    const {
      data: memo,
      error: memoError,
    } = await supabase
      .from("memos")
      .select("*")
      .eq("id", memoId)
      .single();

    if (memoError || !memo) {
      throw new Error(
        "Memo not found"
      );
    }

    if (
      memo.status === "ready" &&
      memo.transcript_error ===
        "Transcription disabled by user."
    ) {
      return res.status(200).json({
        ok: true,
        memoId,
        skipped:
          "transcription disabled by user",
      });
    }

    const currentMonth =
      new Date()
        .toISOString()
        .slice(0, 7);

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        `
          plan,
          subscription_status,
          transcriptions_this_month,
          transcription_month
        `
      )
      .eq(
        "user_id",
        memo.user_id
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        "PROFILE LOAD ERROR:",
        profileError
      );
    }

    const plan =
      profile?.plan || "free";

    const subscriptionStatus =
      profile
        ?.subscription_status ||
      null;

    let count = Number(
      profile
        ?.transcriptions_this_month ||
        0
    );

    let month =
      profile
        ?.transcription_month ||
      currentMonth;

    if (month !== currentMonth) {
      count = 0;
      month = currentMonth;

      await supabase
        .from("profiles")
        .upsert({
          user_id:
            memo.user_id,
          plan,
          transcriptions_this_month:
            0,
          transcription_month:
            currentMonth,
          updated_at:
            new Date()
              .toISOString(),
        });
    }

    if (
      plan !== "supporter" &&
      count >= 30 &&
      !forceRetry
    ) {
      await supabase
        .from("memos")
        .update({
          status: "ready",
          transcript_text: null,
          transcript_error:
            "Free monthly transcription limit reached. Audio was saved.",
          processing_finished_at:
            new Date()
              .toISOString(),
        })
        .eq("id", memoId);

      return res.status(200).json({
        ok: false,
        limitReached: true,
        error:
          "You've reached the free monthly transcription limit. Your voice capsule is safely stored.",
      });
    }

    const hadTranscriptBefore =
      Boolean(
        String(
          memo.transcript_text || ""
        ).trim()
      );

    /*
     * Existing transcript:
     * do not transcribe again unless forceRetry is explicitly true.
     *
     * But evaluate it for the award if Premium is active and no
     * evaluation exists yet.
     */
    if (
      hadTranscriptBefore &&
      !forceRetry
    ) {
      let award:
        AwardProcessingResult | null =
        null;

      try {
        const {
          data: existingEvaluation,
        } = await supabase
          .from(
            "award_memo_evaluations"
          )
          .select(
            "id, qualified, quality_score, reason"
          )
          .eq(
            "memo_id",
            memo.id
          )
          .maybeSingle();

        if (existingEvaluation) {
          award = {
            evaluated: true,
            qualified:
              existingEvaluation
                .qualified === true,
            countedToday: false,
            reason:
              existingEvaluation
                .reason || null,
            qualityScore:
              existingEvaluation
                .quality_score ??
              null,
          };
        } else {
          award =
            await processAwardEvaluation({
              supabase,
              memo,
              transcript:
                String(
                  memo.transcript_text
                ),
              plan,
              subscriptionStatus,
            });
        }
      } catch (awardError) {
        console.error(
          "EXISTING TRANSCRIPT AWARD ERROR:",
          awardError
        );
      }

      return res.status(200).json({
        ok: true,
        memoId,
        skipped:
          "already transcribed",
        award,
      });
    }

    if (
      !forceRetry &&
      memo.processing_started_at &&
      !memo.processing_finished_at
    ) {
      const started =
        new Date(
          memo.processing_started_at
        ).getTime();

      const ageMinutes =
        (Date.now() - started) /
        60000;

      if (ageMinutes < 10) {
        return res
          .status(200)
          .json({
            ok: true,
            memoId,
            skipped:
              "already processing",
          });
      }
    }

    const {
      error: processingError,
    } = await supabase
      .from("memos")
      .update({
        status: "processing",
        processing_started_at:
          new Date()
            .toISOString(),
        processing_finished_at:
          null,
        transcript_error: null,
      })
      .eq("id", memoId);

    if (processingError) {
      throw processingError;
    }

    if (!memo.storage_path) {
      throw new Error(
        "Missing storage_path"
      );
    }

    const {
      data: audioBlob,
      error: downloadError,
    } = await supabase.storage
      .from("memos")
      .download(
        memo.storage_path
      );

    if (
      downloadError ||
      !audioBlob
    ) {
      throw (
        downloadError ||
        new Error(
          "Could not download audio"
        )
      );
    }

    const arrayBuffer =
      await audioBlob.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    const maximumBytes =
      24 * 1024 * 1024;

    if (
      buffer.length >
      maximumBytes
    ) {
      await supabase
        .from("memos")
        .update({
          status: "ready",
          transcript_error:
            "Audio saved. This recording is too large to transcribe in one piece.",
          processing_finished_at:
            new Date()
              .toISOString(),
        })
        .eq("id", memoId);

      return res.status(200).json({
        ok: false,
        memoId,
        error:
          "Audio saved. This recording is too large to transcribe in one piece.",
      });
    }

    const filename =
      memo.mime_type?.includes(
        "mp4"
      ) ||
      memo.mime_type?.includes(
        "aac"
      )
        ? "audio.m4a"
        : memo.mime_type?.includes(
            "ogg"
          )
        ? "audio.ogg"
        : "audio.webm";

    const file = await toFile(
      buffer,
      filename,
      {
        type:
          memo.mime_type ||
          "audio/webm",
      }
    );

    console.log(
      "TRANSCRIBE OPENAI START",
      {
        memoId,
        filename,
        bufferSize:
          buffer.length,
        mimeType:
          memo.mime_type,
      }
    );

    const transcription =
      await openai.audio.transcriptions.create(
        {
          model:
            "gpt-4o-mini-transcribe",
          file,
        }
      );

    const transcript =
      String(
        transcription.text || ""
      ).trim();

    if (!transcript) {
      throw new Error(
        "No understandable speech was detected."
      );
    }

    console.log(
      "TRANSCRIBE OPENAI DONE",
      {
        memoId,
        textLength:
          transcript.length,
      }
    );

    const {
      error: memoUpdateError,
    } = await supabase
      .from("memos")
      .update({
        transcript_text:
          transcript,
        status: "ready",
        processing_finished_at:
          new Date()
            .toISOString(),
        transcript_error: null,
      })
      .eq("id", memoId);

    if (memoUpdateError) {
      throw memoUpdateError;
    }

    /*
     * Embedding failure must not make a successful transcription fail.
     */
    try {
      await embedMemory({
        userId:
          memo.user_id,
        sourceType: "memo",
        sourceId: memo.id,
        content: transcript,
        contentCreatedAt:
          memo.created_at,
      });
    } catch (embeddingError) {
      console.error(
        "EMBED MEMORY ERROR:",
        embeddingError
      );
    }

    let award:
      AwardProcessingResult | null =
      null;

    /*
     * Award failure must not make the Voice Capsule fail.
     * It is logged and can be evaluated again later.
     */
    try {
      award =
        await processAwardEvaluation({
          supabase,
          memo,
          transcript,
          plan,
          subscriptionStatus,
        });
    } catch (awardError: any) {
      console.error(
        "AWARD PROCESSING ERROR:",
        awardError
      );

      await addAuditLog(
        supabase,
        {
          userId:
            memo.user_id,
          memoId: memo.id,
          eventType:
            "evaluation_error",
          details: {
            error:
              awardError?.message ||
              "Unknown award evaluation error",
          },
        }
      );

      award = {
        evaluated: false,
        qualified: false,
        countedToday: false,
        reason:
          "Award evaluation could not be completed.",
        qualityScore: null,
      };
    }

    /*
     * A force retry does not consume another free transcription.
     */
    if (
      plan !== "supporter" &&
      !hadTranscriptBefore
    ) {
      const {
        error: countError,
      } = await supabase
        .from("profiles")
        .upsert({
          user_id:
            memo.user_id,
          plan,
          transcriptions_this_month:
            count + 1,
          transcription_month:
            currentMonth,
          updated_at:
            new Date()
              .toISOString(),
        });

      if (countError) {
        console.error(
          "TRANSCRIPTION COUNT ERROR:",
          countError
        );
      }
    }

    return res.status(200).json({
      ok: true,
      memoId,
      transcriptLength:
        transcript.length,
      award,
    });
  } catch (error: any) {
    console.error(
      "TRANSCRIBE ERROR:",
      error
    );

    const {
      error: failedUpdateError,
    } = await supabase
      .from("memos")
      .update({
        status: "failed",
        transcript_error:
          error.message ||
          "Unknown error",
        processing_finished_at:
          new Date()
            .toISOString(),
      })
      .eq("id", memoId);

    if (failedUpdateError) {
      console.error(
        "FAILED STATUS UPDATE ERROR:",
        failedUpdateError
      );
    }

    /*
     * Keep HTTP 200 for compatibility with your
     * Supabase webhook and existing retry endpoint.
     */
    return res.status(200).json({
      ok: false,
      memoId,
      error:
        error.message ||
        "Unknown error",
    });
  }
}