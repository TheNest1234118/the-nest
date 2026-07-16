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

function getBearerToken(
  req: VercelRequest
) {
  const authorization =
    typeof req.headers.authorization === "string"
      ? req.headers.authorization
      : "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return "";
  }

  return authorization
    .slice("Bearer ".length)
    .trim();
}

async function safeReadResponse(
  response: Response
) {
  const text =
    await response.text();

  try {
    return {
      text,
      json: JSON.parse(text),
    };
  } catch {
    return {
      text,
      json: null,
    };
  }
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

  try {
    const token =
      getBearerToken(req);

    const memoId = String(
      req.body?.memoId || ""
    ).trim();

    if (!token) {
      return res.status(401).json({
        error:
          "Missing login token",
      });
    }

    if (!memoId) {
      return res.status(400).json({
        error: "Missing memo id",
      });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env
        .VITE_SUPABASE_URL;

    const anonKey =
      process.env
        .SUPABASE_ANON_KEY ||
      process.env
        .VITE_SUPABASE_ANON_KEY;

    const serviceKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    const webhookSecret =
      process.env
        .TRANSCRIBE_WEBHOOK_SECRET;

    const appUrl =
      process.env.PUBLIC_APP_URL ||
      "https://www.thenestapp.space";

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceKey ||
      !webhookSecret
    ) {
      return res.status(500).json({
        error:
          "Missing Supabase or transcription environment variables",
      });
    }

    /*
     * Authenticate the user using their normal access token.
     */
    const authClient =
      createClient(
        supabaseUrl,
        anonKey
      );

    const {
      data: { user },
      error: userError,
    } =
      await authClient.auth.getUser(
        token
      );

    if (
      userError ||
      !user
    ) {
      return res.status(401).json({
        error: "Invalid login",
      });
    }

    /*
     * All database mutations below use the service role,
     * but ownership is still checked first.
     */
    const supabase =
      createClient(
        supabaseUrl,
        serviceKey
      );

    const {
      data: memo,
      error: memoError,
    } = await supabase
      .from("memos")
      .select(
        `
          id,
          user_id,
          storage_path,
          status,
          transcript_text
        `
      )
      .eq("id", memoId)
      .eq("user_id", user.id)
      .single();

    if (
      memoError ||
      !memo
    ) {
      return res.status(404).json({
        error: "Memo not found",
      });
    }

    if (!memo.storage_path) {
      return res.status(400).json({
        error:
          "This memo has no saved audio.",
      });
    }

    /*
     * Remove the previous qualifying day linked specifically
     * to this memo before reassessing it.
     *
     * Deleting the evaluation also cascades to linked day rows,
     * but deleting the day explicitly makes the intent clear.
     */
    const {
      error:
        qualifiedDayDeleteError,
    } = await supabase
      .from(
        "award_qualified_days"
      )
      .delete()
      .eq(
        "qualifying_memo_id",
        memoId
      )
      .eq("user_id", user.id);

    if (
      qualifiedDayDeleteError
    ) {
      console.error(
        "RETRY AWARD DAY DELETE ERROR:",
        qualifiedDayDeleteError
      );

      return res.status(500).json({
        error:
          "Could not reset the previous award decision.",
      });
    }

    const {
      error:
        evaluationDeleteError,
    } = await supabase
      .from(
        "award_memo_evaluations"
      )
      .delete()
      .eq("memo_id", memoId)
      .eq("user_id", user.id);

    if (
      evaluationDeleteError
    ) {
      console.error(
        "RETRY AWARD EVALUATION DELETE ERROR:",
        evaluationDeleteError
      );

      return res.status(500).json({
        error:
          "Could not reset the previous award evaluation.",
      });
    }

    /*
     * Recalculate immediately in case the removed memo
     * previously contributed a qualifying day.
     */
    const {
      error:
        progressRecalculationError,
    } = await supabase.rpc(
      "recalculate_award_progress",
      {
        p_user_id: user.id,
      }
    );

    if (
      progressRecalculationError
    ) {
      console.error(
        "RETRY AWARD RECALCULATION ERROR:",
        progressRecalculationError
      );

      return res.status(500).json({
        error:
          "Could not recalculate award progress.",
      });
    }

    await supabase
      .from("award_audit_log")
      .insert({
        user_id: user.id,
        memo_id: memoId,
        event_type:
          "memo_retry_requested",
        details: {
          previous_status:
            memo.status,
          had_previous_transcript:
            Boolean(
              String(
                memo.transcript_text ||
                  ""
              ).trim()
            ),
        },
      });

    /*
     * Clear processing timestamps so /api/transcribe
     * accepts the forced retry immediately.
     */
    const {
      error: resetError,
    } = await supabase
      .from("memos")
      .update({
        status: "processing",
        transcript_error: null,
        processing_started_at:
          null,
        processing_finished_at:
          null,
      })
      .eq("id", memoId)
      .eq("user_id", user.id);

    if (resetError) {
      return res.status(500).json({
        error:
          resetError.message ||
          "Could not prepare transcription retry.",
      });
    }

    const webhookUrl =
      `${appUrl.replace(/\/$/, "")}` +
      "/api/transcribe";

    const transcribeResponse =
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",

          "x-webhook-secret":
            webhookSecret,
        },
        body: JSON.stringify({
          record: {
            id: memoId,
          },
          forceRetry: true,
        }),
      });

    const responseData =
      await safeReadResponse(
        transcribeResponse
      );

    /*
     * /api/transcribe intentionally may return HTTP 200
     * with { ok: false }, so inspect the body as well.
     */
    const transcriptionSucceeded =
      transcribeResponse.ok &&
      responseData.json?.ok !== false;

    if (
      !transcriptionSucceeded
    ) {
      return res.status(502).json({
        ok: false,
        error:
          responseData.json?.error ||
          "Could not retry transcription.",

        transcribeStatus:
          transcribeResponse.status,

        transcribeResponse:
          responseData.json ||
          responseData.text,
      });
    }

    return res.status(200).json({
      ok: true,
      memoId,
      transcribeStatus:
        transcribeResponse.status,
      result:
        responseData.json ||
        responseData.text,
    });
  } catch (error: any) {
    console.error(
      "RETRY TRANSCRIBE ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Could not retry transcription.",
    });
  }
}