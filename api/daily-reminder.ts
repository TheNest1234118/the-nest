import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import OpenAI from "openai";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { createHash } from "node:crypto";
import ws from "ws";

export const config = {
  maxDuration: 300,
};

/* =========================================================
   SHARED
========================================================= */

const reminderMessages = [
  "A quiet moment, if you want one.",
  "The Nest is here when you have space to reflect.",
  "A gentle check-in, only if it feels right.",
];

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws as any,
      },
    }
  );
}

function getAction(req: VercelRequest) {
  const queryAction =
    typeof req.query.action === "string"
      ? req.query.action
      : "";

  const bodyAction =
    typeof req.body?.action === "string"
      ? req.body.action
      : "";

  return (
    queryAction ||
    bodyAction ||
    "daily-reminder"
  );
}

function getCronSecret(req: VercelRequest) {
  const querySecret =
    typeof req.query.secret === "string"
      ? req.query.secret
      : "";

  const headerSecret =
    typeof req.headers["x-cron-secret"] === "string"
      ? req.headers["x-cron-secret"]
      : "";

  const authorization =
    typeof req.headers.authorization === "string"
      ? req.headers.authorization
      : "";

  return {
    querySecret,
    headerSecret,
    authorization,
  };
}

function isCronAuthorized(
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
  } = getCronSecret(req);

  return (
    querySecret === expected ||
    headerSecret === expected ||
    authorization ===
      `Bearer ${expected}`
  );
}

/* =========================================================
   1) DAILY REMINDER
   Default action:
   /api/daily-reminder?secret=...
========================================================= */

function getReminderLocalNow(
  timezone: string
) {
  const now = new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: timezone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour12: false,
      }
    ).formatToParts(now);

  const get = (type: string) =>
    parts.find(
      (p) => p.type === type
    )?.value || "";

  return {
    time: `${get("hour")}:${get(
      "minute"
    )}`,

    day: [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ].indexOf(get("weekday")),

    sentKey: `${get("year")}-${get(
      "month"
    )}-${get("day")}-${get(
      "hour"
    )}:${get("minute")}`,
  };
}

async function handleDailyReminder(
  req: VercelRequest,
  res: VercelResponse
) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized",
    });
  }

  const appId =
    process.env.ONESIGNAL_APP_ID;

  const apiKey =
    process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return res.status(500).json({
      ok: false,
      error:
        "Missing OneSignal environment variables",
    });
  }

  const supabase =
    getSupabaseAdmin();

  const {
    data: prefs,
    error,
  } = await supabase
    .from(
      "notification_preferences"
    )
    .select("*")
    .eq("enabled", true);

  if (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }

  const dueUsers =
    (prefs || []).filter((pref) => {
      const local =
        getReminderLocalNow(
          pref.reminder_timezone ||
            "Europe/Zurich"
        );

      return (
        local.time ===
          pref.reminder_time &&
        pref.reminder_days?.includes(
          local.day
        ) &&
        pref.last_reminder_sent_key !==
          local.sentKey
      );
    });

  if (dueUsers.length === 0) {
    return res.status(200).json({
      ok: true,
      sent: 0,
      checked: (prefs || []).map(
        (pref) => {
          const local =
            getReminderLocalNow(
              pref.reminder_timezone ||
                "Europe/Zurich"
            );

          return {
            id:
              pref.onesignal_subscription_id,
            enabled: pref.enabled,
            db_time:
              pref.reminder_time,
            local_time:
              local.time,
            db_days:
              pref.reminder_days,
            local_day:
              local.day,
            last_sent:
              pref.last_reminder_sent_key,
            sent_key:
              local.sentKey,
            time_match:
              local.time ===
              pref.reminder_time,
            day_match:
              pref.reminder_days?.includes(
                local.day
              ),
            not_sent_yet:
              pref.last_reminder_sent_key !==
              local.sentKey,
          };
        }
      ),
    });
  }

  const message =
    dueUsers[0]?.reminder_message ||
    reminderMessages[
      Math.floor(
        Math.random() *
          reminderMessages.length
      )
    ];

  const payload = {
    app_id: appId,

    include_subscription_ids:
      dueUsers.map(
        (u) =>
          u.onesignal_subscription_id
      ),

    headings: {
      en: "The Nest",
    },

    contents: {
      en: message,
    },

    url:
      "https://www.thenestapp.space/home?notification=onesignal&category=reminder",
  };

  const response = await fetch(
    "https://api.onesignal.com/notifications",
    {
      method: "POST",
      headers: {
        Authorization:
          `Key ${apiKey}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(
        payload
      ),
    }
  );

  const onesignalText =
    await response.text();

  let onesignalJson: any = null;

  try {
    onesignalJson =
      JSON.parse(onesignalText);
  } catch {}

  if (
    response.ok &&
    onesignalJson?.id
  ) {
    for (const user of dueUsers) {
      const local =
        getReminderLocalNow(
          user.reminder_timezone ||
            "Europe/Zurich"
        );

      await supabase
        .from(
          "notification_preferences"
        )
        .update({
          last_reminder_sent_key:
            local.sentKey,
        })
        .eq(
          "onesignal_subscription_id",
          user.onesignal_subscription_id
        );
    }
  }

  return res
    .status(response.status)
    .json({
      ok: response.ok,
      sent: dueUsers.length,
      payload,

      dueUsers:
        dueUsers.map((u) => ({
          id:
            u.onesignal_subscription_id,
          reminder_time:
            u.reminder_time,
          timezone:
            u.reminder_timezone,
        })),

      onesignal:
        onesignalJson ||
        onesignalText,
    });
}

/* =========================================================
   2) GENERATE MEMO TITLE
   POST:
   /api/daily-reminder?action=generate-memo-title

   Body:
   { "text": "..." }
========================================================= */

async function handleGenerateMemoTitle(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const text =
    String(
      req.body?.text || ""
    ).trim();

  if (!text) {
    return res.status(400).json({
      error: "Missing text",
    });
  }

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY missing",
    });
  }

  const openai =
    new OpenAI({
      apiKey,
    });

  const completion =
    await openai.chat.completions.create({
      model: "gpt-4o-mini",

      temperature: 0.75,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",

          content: `
You create title suggestions for voice capsules in a journaling app called The Nest.

Read the transcript and generate 5 short natural title options.

Rules:
- Return JSON only.
- Titles must be based only on the transcript.
- Do not invent topics.
- Max 6 words per title.
- Make titles emotional, natural and human.
- No quotes.
- No numbering.
- Use the same language as the transcript unless the transcript is mixed.
- Avoid generic titles like "Voice capsule" or "My thoughts".

Return:
{
  "titles": ["title 1", "title 2", "title 3", "title 4", "title 5"]
}
          `,
        },

        {
          role: "user",
          content:
            text.slice(0, 4000),
        },
      ],
    });

  const raw =
    completion.choices[0]
      ?.message?.content ||
    "{}";

  const parsed =
    JSON.parse(raw);

  return res.status(200).json({
    titles:
      Array.isArray(
        parsed.titles
      )
        ? parsed.titles.slice(
            0,
            5
          )
        : [],
  });
}

/* =========================================================
   3) MIRROR GENERATOR
   Can be called directly with:
   POST /api/daily-reminder?action=generate-mirror

   It is also used internally by run-mirror-analysis.
========================================================= */

type MirrorInputEntry = {
  id: string;
  title: string;
  transcript: string;
  created_at: string;
};

type PreviousMirrorSummary = {
  title?: string;
  reflection?: string;
  past_entry_id?: string;
  recent_entry_id?: string;
};

type GenerateMirrorInput = {
  recentEntries:
    MirrorInputEntry[];

  pastEntries:
    MirrorInputEntry[];

  previousMirrors?:
    PreviousMirrorSummary[];
};

type GeneratedMirrorResult = {
  found: boolean;
  reason: string;

  title: string;
  past: string;
  present: string;
  reflection: string;

  past_entry_id: string;
  recent_entry_id: string;

  past_date: string;
  recent_date: string;

  confidence_score: number;

  category:
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
};

const mirrorResponseSchema = {
  name:
    "mirror_comparison",

  strict: true,

  schema: {
    type: "object",

    additionalProperties:
      false,

    required: [
      "found",
      "reason",
      "title",
      "past",
      "present",
      "reflection",
      "past_entry_id",
      "recent_entry_id",
      "past_date",
      "recent_date",
      "confidence_score",
      "category",
    ],

    properties: {
      found: {
        type: "boolean",
      },

      reason: {
        type: "string",
      },

      title: {
        type: "string",
      },

      past: {
        type: "string",
      },

      present: {
        type: "string",
      },

      reflection: {
        type: "string",
      },

      past_entry_id: {
        type: "string",
      },

      recent_entry_id: {
        type: "string",
      },

      past_date: {
        type: "string",
      },

      recent_date: {
        type: "string",
      },

      confidence_score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
      },

      category: {
        type: "string",

        enum: [
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
        ],
      },
    },
  },
};
const MIRROR_MIN_DAYS_APART = 7;
const MIRROR_SYSTEM_PROMPT = `
You are The Nest Mirror.

The Nest is not a therapist.
The Nest is not a life coach.
The Nest is a calm observer.

Compare RECENT voice recordings with OLDER voice recordings.
Your goal is not to summarize. Your goal is to reveal one meaningful change.

A valid Mirror MUST compare two entries about the same concrete subject.

The shared subject must be clearly identifiable in both entries.

Examples of a shared concrete subject:
- the same project
- the same job
- the same person
- the same relationship
- the same goal
- the same habit
- the same decision
- the same concern
- the same place or situation

Broad categories are NOT sufficient.

For example:
- "work" + "work" is not automatically a match.
- "confidence" + "confidence" is not automatically a match.
- "future" + "future" is not automatically a match.
- "motivation" + "motivation" is not automatically a match.

INVALID:
Past: "I don't want to work in a kitchen."
Present: "I feel good about this project."

These are different subjects even though both relate broadly to work.

INVALID:
Past: "I want to financially support my parents."
Present: "I feel confident about my project."

These are different subjects even though both may relate to future goals.

Before returning found=true, verify:
1. What exact concrete subject appears in BOTH entries?
2. Would a human naturally say these two statements are about the same thing?
3. Is there an actual change in the speaker's view of that same thing?

If the concrete shared subject cannot be clearly identified, return found=false.

Never manufacture a connection merely because two entries share a broad category or emotional tone.

Rules:
- Use only the supplied transcripts.
- Never invent events or quotes.
- Never diagnose.
- Never create drama.
- Never manipulate emotion.
- Never claim a change unless the supplied entries support it.
- The past and present entries must be at least 7 days apart.
- Prefer exact short quotes copied from the transcripts.
- Do not repeat previous Mirror results.
- Return only one comparison.
- Return found=false when there is no strong, useful contrast.
- Confidence below 70 should return found=false.
- Use the language used by the majority of the entries.

When found=true:
- title: short, human and intriguing.
- past: one short exact quote or faithful concise statement from the older entry.
- present: one short exact quote or faithful concise statement from the recent entry.
- reflection: one calm sentence explaining the change.
- past_entry_id and recent_entry_id must exactly match supplied IDs.
- dates must exactly match the selected supplied entry dates.
- Maximum total visible text: 120 words.

Return valid JSON only.
`;

function cleanMirrorEntries(
  value: unknown
): MirrorInputEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item ===
          "object"
    )
    .map((item: any) => ({
      id:
        String(
          item.id || ""
        ),

      title:
        String(
          item.title ||
            "Voice Capsule"
        ),

      transcript:
        String(
          item.transcript ||
            ""
        ).trim(),

      created_at:
        String(
          item.created_at ||
            ""
        ),
    }))
    .filter(
      (item) =>
        item.id &&
        item.created_at &&
        item.transcript.length >=
          20
    )
    .slice(0, 100);
}

function cleanPreviousMirrors(
  value: unknown
): PreviousMirrorSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item ===
          "object"
    )
    .map((item: any) => ({
      title:
        String(
          item.title || ""
        ),

      reflection:
        String(
          item.reflection ||
            ""
        ),

      past_entry_id:
        String(
          item.past_entry_id ||
            ""
        ),

      recent_entry_id:
        String(
          item.recent_entry_id ||
            ""
        ),
    }))
    .slice(0, 30);
}

function emptyMirrorResult(
  reason: string
): GeneratedMirrorResult {
  return {
    found: false,
    reason,

    title: "",
    past: "",
    present: "",
    reflection: "",

    past_entry_id: "",
    recent_entry_id: "",

    past_date: "",
    recent_date: "",

    confidence_score: 0,

    category: "other",
  };
}

function normalizeMirrorResult(
  value: any,
  recentEntries:
    MirrorInputEntry[],
  pastEntries:
    MirrorInputEntry[]
): GeneratedMirrorResult {
  const recent =
    recentEntries.find(
      (entry) =>
        entry.id ===
        String(
          value
            ?.recent_entry_id ||
            ""
        )
    );

  const past =
    pastEntries.find(
      (entry) =>
        entry.id ===
        String(
          value
            ?.past_entry_id ||
            ""
        )
    );

  const score =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          Number(
            value
              ?.confidence_score ||
              0
          )
        )
      )
    );

  if (
    value?.found !== true ||
    !recent ||
    !past ||
    score < 80
  ) {
    return emptyMirrorResult(
      String(
        value?.reason ||
          "No sufficiently strong change was found."
      )
    );
  }

  const separationDays =
    Math.abs(
      new Date(
        recent.created_at
      ).getTime() -
        new Date(
          past.created_at
        ).getTime()
    ) /
    (24 *
      60 *
      60 *
      1000);

      if (
        separationDays < MIRROR_MIN_DAYS_APART
      ) {
        return emptyMirrorResult(
          `The selected entries must be at least ${MIRROR_MIN_DAYS_APART} days apart.`
        );
      }

  return {
    found: true,

    reason:
      String(
        value?.reason || ""
      ),

    title:
      String(
        value?.title || ""
      )
        .trim()
        .slice(0, 140),

    past:
      String(
        value?.past || ""
      )
        .trim()
        .slice(0, 500),

    present:
      String(
        value?.present || ""
      )
        .trim()
        .slice(0, 500),

    reflection:
      String(
        value?.reflection ||
          ""
      )
        .trim()
        .slice(0, 700),

    past_entry_id:
      past.id,

    recent_entry_id:
      recent.id,

    past_date:
      past.created_at,

    recent_date:
      recent.created_at,

    confidence_score:
      score,

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
    ].includes(
      String(
        value?.category
      )
    )
      ? value.category
      : "other",
  };
}

async function generateMirrorComparison({
  recentEntries,
  pastEntries,
  previousMirrors = [],
}: GenerateMirrorInput): Promise<GeneratedMirrorResult> {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY missing"
    );
  }

  const cleanRecent =
    cleanMirrorEntries(
      recentEntries
    );

  const cleanPast =
    cleanMirrorEntries(
      pastEntries
    );

  const cleanPrevious =
    cleanPreviousMirrors(
      previousMirrors
    );

  if (
    cleanRecent.length === 0 ||
    cleanPast.length === 0
  ) {
    return emptyMirrorResult(
      "Mirror needs both a recent and an older Voice Capsule."
    );
  }

  const openai =
    new OpenAI({
      apiKey,
    });

  const completion =
    await openai.chat.completions.create({
      model: "gpt-4o-mini",

      temperature: 0.15,

      response_format: {
        type: "json_schema",

        json_schema:
          mirrorResponseSchema,
      },

      messages: [
        {
          role: "system",

          content:
            MIRROR_SYSTEM_PROMPT,
        },

        {
          role: "user",

          content:
            JSON.stringify({
              task:
  "Find at most one strong same-subject change between a recent and an older recording. Prefer found=false over connecting unrelated subjects.",

              recent_entries:
                cleanRecent,

              older_entries:
                cleanPast,

              previous_mirrors:
                cleanPrevious,

                constraints: {
                  minimum_days_apart:
                    MIRROR_MIN_DAYS_APART,
                
                  minimum_confidence:
                    80,
                
                  return_zero_when_uncertain:
                    true,
                },
            }),
        },
      ],
    });

  const raw =
    completion.choices[0]
      ?.message?.content ||
    "{}";

  let parsed: any;

  try {
    parsed =
      JSON.parse(raw);
  } catch {
    throw new Error(
      "OpenAI returned invalid Mirror JSON."
    );
  }

  return normalizeMirrorResult(
    parsed,
    cleanRecent,
    cleanPast
  );
}

function isMirrorInternalAuthorized(
  req: VercelRequest
) {
  const expected =
    process.env
      .MIRROR_INTERNAL_SECRET ||
    process.env.CRON_SECRET;

  if (!expected) {
    return false;
  }

  const authorization =
    typeof req.headers
      .authorization ===
    "string"
      ? req.headers
          .authorization
      : "";

  const internalSecret =
    typeof req.headers[
      "x-internal-secret"
    ] === "string"
      ? req.headers[
          "x-internal-secret"
        ]
      : "";

  const querySecret =
    typeof req.query
      .secret === "string"
      ? req.query.secret
      : "";

  return (
    authorization ===
      `Bearer ${expected}` ||
    internalSecret ===
      expected ||
    querySecret === expected
  );
}

async function handleGenerateMirror(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error:
        "Method not allowed",
    });
  }

  if (
    !isMirrorInternalAuthorized(
      req
    )
  ) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  try {
    const result =
      await generateMirrorComparison({
        recentEntries:
          req.body
            ?.recentEntries ||
          [],

        pastEntries:
          req.body
            ?.pastEntries ||
          [],

        previousMirrors:
          req.body
            ?.previousMirrors ||
          [],
      });

    return res
      .status(200)
      .json(result);
  } catch (error: any) {
    console.error(
      "GENERATE MIRROR ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          "Could not generate Mirror comparison.",
      });
  }
}

/* =========================================================
   4) GENERATE REFLECTION
   POST:
   /api/daily-reminder?action=generate-reflection
========================================================= */

type ReflectionType =
  | "weekly"
  | "monthly";

const QUIET_NOT_ENOUGH_MESSAGE =
  "Add a few more thoughts or voice notes first. Your reflection will be more meaningful when there is more to look back on.";

function getReflectionPeriod(
  type: ReflectionType
) {
  const now = new Date();

  const end =
    new Date(now);

  const start =
    new Date(now);

  if (type === "weekly") {
    start.setDate(
      now.getDate() - 7
    );
  } else {
    start.setDate(
      now.getDate() - 30
    );
  }

  return {
    startIso:
      start.toISOString(),

    endIso:
      end.toISOString(),

    startDate:
      start
        .toISOString()
        .slice(0, 10),

    endDate:
      end
        .toISOString()
        .slice(0, 10),
  };
}

function getReflectionLimitDays(
  type: ReflectionType
) {
  return type === "weekly"
    ? 7
    : 30;
}

function getReflectionMinimums(
  type: ReflectionType
) {
  return type === "weekly"
    ? {
        thoughts: 3,
        memos: 2,
      }
    : {
        thoughts: 8,
        memos: 4,
      };
}

function getReflectionLockPayload(
  type: ReflectionType,
  lastCreatedAt: string
) {
  const limitDays =
    getReflectionLimitDays(
      type
    );

  const last =
    new Date(lastCreatedAt);

  const next =
    new Date(last);

  next.setDate(
    last.getDate() +
      limitDays
  );

  const now =
    new Date();

  const msRemaining =
    next.getTime() -
    now.getTime();

  const daysRemaining =
    Math.max(
      1,
      Math.ceil(
        msRemaining /
          86400000
      )
    );

  return {
    ok: false,

    error:
      `Your next ${type} reflection will be available in ${daysRemaining} days.`,

    nextAvailableAt:
      next.toISOString(),

    daysRemaining,
  };
}

async function handleGenerateReflection(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (
      req.method !== "POST"
    ) {
      return res
        .status(405)
        .json({
          ok: false,
          error:
            "Method not allowed",
        });
    }

    const supabase =
      getSupabaseAdmin();

    const token =
      req.headers
        .authorization
        ?.replace(
          "Bearer ",
          ""
        );

    if (!token) {
      return res
        .status(401)
        .json({
          ok: false,
          error:
            "Missing login token",
        });
    }

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser(
        token
      );

    if (
      userError ||
      !user
    ) {
      return res
        .status(401)
        .json({
          ok: false,
          error:
            "Invalid login",
        });
    }

    const type =
      req.body
        ?.type as ReflectionType;

    if (
      type !== "weekly" &&
      type !== "monthly"
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            "Invalid reflection type",
        });
    }

    const {
      data: profile,
    } =
      await supabase
        .from("profiles")
        .select("plan")
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    const plan =
      profile?.plan ||
      "free";

    if (
      type === "monthly" &&
      plan !== "supporter"
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          error:
            "Monthly Reflections use AI processing and are included in the Supporter Plan.",
        });
    }

    const {
      data: settings,
    } =
      await supabase
        .from(
          "user_settings"
        )
        .select(
          "allow_ai_reflections"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      !settings
        ?.allow_ai_reflections
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          error:
            "Please allow AI reflections first.",
        });
    }

    const {
      data:
        lastReflection,

      error:
        lastReflectionError,
    } =
      await supabase
        .from(
          "reflections"
        )
        .select(
          "created_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "type",
          type
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      lastReflectionError
    ) {
      throw lastReflectionError;
    }

    if (
      lastReflection
        ?.created_at
    ) {
      const lastCreatedAt =
        new Date(
          lastReflection.created_at
        );

      const nextAvailableAt =
        new Date(
          lastCreatedAt
        );

      nextAvailableAt.setDate(
        lastCreatedAt.getDate() +
          getReflectionLimitDays(
            type
          )
      );

      if (
        new Date() <
        nextAvailableAt
      ) {
        return res
          .status(429)
          .json(
            getReflectionLockPayload(
              type,
              lastReflection.created_at
            )
          );
      }
    }

    const period =
      getReflectionPeriod(
        type
      );

    const minimums =
      getReflectionMinimums(
        type
      );

    const {
      data: thoughts,
      error:
        thoughtsError,
    } =
      await supabase
        .from("thoughts")
        .select(
          "text, created_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .gte(
          "created_at",
          period.startIso
        )
        .lte(
          "created_at",
          period.endIso
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (
      thoughtsError
    ) {
      throw thoughtsError;
    }

    const {
      data: anchors,
      error:
        anchorsError,
    } =
      await supabase
        .from("anchors")
        .select(
          "type, content, created_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .gte(
          "created_at",
          period.startIso
        )
        .lte(
          "created_at",
          period.endIso
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (
      anchorsError
    ) {
      throw anchorsError;
    }

    const {
      data: memos,
      error:
        memosError,
    } =
      await supabase
        .from("memos")
        .select(
          "title, transcript_text, created_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .gte(
          "created_at",
          period.startIso
        )
        .lte(
          "created_at",
          period.endIso
        )
        .not(
          "transcript_text",
          "is",
          null
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (
      memosError
    ) {
      throw memosError;
    }

    const {
      data: moods,
      error:
        moodsError,
    } =
      await supabase
        .from(
          "user_daily_mood"
        )
        .select(
          "mood, mood_date, created_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .gte(
          "created_at",
          period.startIso
        )
        .lte(
          "created_at",
          period.endIso
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (
      moodsError
    ) {
      throw moodsError;
    }

    const thoughtCount =
      thoughts?.length ??
      0;

    const anchorCount =
      anchors?.length ??
      0;

    const memoCount =
      memos?.length ??
      0;

    const hasEnoughContent =
      thoughtCount >=
        minimums.thoughts ||
      memoCount >=
        minimums.memos ||
      anchorCount >= 3 ||
      thoughtCount +
        memoCount +
        anchorCount >=
        5;

    if (
      !hasEnoughContent
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            QUIET_NOT_ENOUGH_MESSAGE,
        });
    }

    const entries = [
      ...(thoughts ??
        []).map(
        (t) =>
          `[thought | ${t.created_at}]\n${t.text}`
      ),

      ...(memos ??
        []).map(
        (m) =>
          `[voice memo transcript | ${m.created_at} | ${
            m.title ||
            "Voice capsule"
          }]\n${m.transcript_text}`
      ),

      ...(anchors ??
        []).map(
        (a) =>
          `[anchor | ${a.created_at} | ${a.type}]\n${a.content}`
      ),

      ...(moods ??
        []).map(
        (m) =>
          `[mood check-in | ${
            m.created_at ||
            m.mood_date
          }]\nMood: ${m.mood}`
      ),
    ];

    const weeklyJson = `
{
  "summary": "One clear sentence describing what this week was mainly about.",
  "themes": ["Most discussed topic, optionally with mention count"],
  "cared_about": ["Recurring pattern or repeated thought"],
  "positive_moments": ["What changed compared to the previous week"],
  "open_thoughts": ["Exactly one gentle question"],
  "closing_sentence": ""
}
    `;

    const monthlyJson = `
{
  "summary": "6-10 warm sentences describing the month as a whole",
  "themes": ["theme"],
  "what_stayed": ["things that consistently mattered"],
  "what_changed": ["shifts, developments or new directions"],
  "moments_worth_keeping": ["meaningful moments"],
  "open_thoughts": ["gentle questions that remain open"],
  "closing_sentence": "a reflective closing sentence"
}
    `;

    const prompt = `
You are creating a ${type} reflection for a private app called The Nest.

The Nest is not therapy.
The Nest is not productivity coaching.
The Nest is not self-improvement.

Your role is simply to help someone gently look back at their own thoughts.

IMPORTANT:
- Never diagnose.
- Never give advice.
- Never tell the user what they should do.
- Never create goals, tasks, action plans or productivity tips.
- Never sound like a therapist.
- Never sound like a life coach.
- Never exaggerate emotions.
- Never invent information that is not present in the user's thoughts.
- Write with warmth, simplicity and emotional intelligence.

The reflection should feel concrete, grounded and specific.

Prefer:
- specific repeated topics
- mention counts when possible
- concrete examples from entries
- changes across the week
- things the user returned to multiple times

Avoid:
- vague emotional summaries
- broad statements that could apply to anyone
- therapy language
- generic phrases like "personal challenges", "social connections", "emotional journey", "growth", "self-reflection"

${
  type ===
  "weekly"
    ? `
WEEKLY REFLECTION

Structure:
1. This week in one sentence
2. What stayed with you
3. Patterns you returned to
4. What changed
5. One question

Return this exact JSON shape:
${weeklyJson}
`
    : `
MONTHLY REFLECTION

Focus on:
- The overall story of the month
- Patterns that appeared repeatedly
- What changed throughout the month
- What remained important
- Moments worth remembering
- Gentle observations about growth or shifts in perspective

Return this exact JSON shape:
${monthlyJson}
`
}

MOOD CHECK-INS

Mood check-ins should be included naturally whenever enough mood data is available.

Do not list moods or counts.
Use mood check-ins as emotional context for thoughts, voice memo transcripts and anchors.
Never invent mood patterns that are not supported by the data.

OPEN THOUGHTS RULE

Open thoughts are not advice.

TONE:
Quiet.
Warm.
Gentle.
Human.

Return valid JSON only.

TEXT:

${entries.join(
  "\n\n---\n\n"
)}
    `;

    const apiKey =
      process.env
        .OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY missing"
      );
    }

    const openai =
      new OpenAI({
        apiKey,
      });

    const completion =
      await openai.chat.completions.create({
        model:
          "gpt-4o-mini",

        messages: [
          {
            role:
              "system",
            content:
              prompt,
          },
        ],

        response_format: {
          type:
            "json_object",
        },
      });

    const parsed =
      JSON.parse(
        completion
          .choices[0]
          ?.message
          ?.content ||
          "{}"
      );

    const {
      data:
        reflection,

      error:
        insertError,
    } =
      await supabase
        .from(
          "reflections"
        )
        .insert({
          user_id:
            user.id,

          type,

          period_start:
            period.startDate,

          period_end:
            period.endDate,

          summary:
            parsed.summary ??
            "",

          themes:
            parsed.themes ??
            [],

          worries:
            parsed.worries ??
            [],

          positive_moments:
            parsed.positive_moments ??
            parsed.moments_worth_keeping ??
            [],

          cared_about:
            parsed.cared_about ??
            parsed.what_stayed ??
            [],

          open_thoughts:
            parsed.open_thoughts ??
            [],

          closing_sentence:
            parsed.closing_sentence ??
            "",
        })
        .select()
        .single();

    if (insertError) {
      throw insertError;
    }

    return res
      .status(200)
      .json({
        ok: true,
        reflection,
        cached: false,
      });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        ok: false,

        error:
          String(
            error?.message ||
              error
          ),
      });
  }
}

/* =========================================================
   5) RUN MIRROR ANALYSIS
   GET/POST:
   /api/daily-reminder?action=run-mirror-analysis&secret=...
   Backfill:
   /api/daily-reminder?action=run-mirror-analysis&secret=...&force=true&backfill=true
========================================================= */

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

function getMirrorLocalNow(
  timezone: string
) {
  try {
    const parts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            timezone,

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",

          hour:
            "2-digit",

          hour12:
            false,
        }
      ).formatToParts(
        new Date()
      );

    const get = (
      type: string
    ) =>
      parts.find(
        (part) =>
          part.type ===
          type
      )?.value || "";

    return {
      date:
        `${get("year")}-${get(
          "month"
        )}-${get("day")}`,

      hour:
        Number(
          get("hour")
        ),
    };
  } catch {
    const now =
      new Date();

    return {
      date:
        now
          .toISOString()
          .slice(0, 10),

      hour:
        now.getUTCHours(),
    };
  }
}

function mirrorFingerprint(
  userId: string,
  recentEntryId: string,
  pastEntryId: string,
  title: string
) {
  return createHash(
    "sha256"
  )
    .update(
      [
        userId,
        recentEntryId,
        pastEntryId,
        title
          .trim()
          .toLowerCase(),
      ].join("|")
    )
    .digest("hex");
}

async function getMirrorTimezone(
  supabase:
    SupabaseClient,
  userId: string
) {
  const {
    data:
      notification,
  } =
    await supabase
      .from(
        "notification_preferences"
      )
      .select(
        "reminder_timezone"
      )
      .eq(
        "user_id",
        userId
      )
      .not(
        "reminder_timezone",
        "is",
        null
      )
      .limit(1)
      .maybeSingle();

  if (
    notification
      ?.reminder_timezone
  ) {
    return String(
      notification
        .reminder_timezone
    );
  }

  const {
    data: state,
  } =
    await supabase
      .from(
        "mirror_analysis_state"
      )
      .select(
        "timezone"
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  return String(
    state?.timezone ||
      "Europe/Zurich"
  );
}

async function sendMirrorPush({
  appId,
  apiKey,
  subscriptionIds,
}: {
  appId: string;
  apiKey: string;
  subscriptionIds:
    string[];
}) {
  const ids = [
    ...new Set(
      subscriptionIds.filter(
        Boolean
      )
    ),
  ];

  if (
    ids.length === 0
  ) {
    return false;
  }

  const response =
    await fetch(
      "https://api.onesignal.com/notifications",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Key ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            app_id:
              appId,

            include_subscription_ids:
              ids,

            headings: {
              en:
                "🪞 Your Mirror found a change",
            },

            contents: {
              en:
                "The way you speak about something has changed.",
            },

            url:
              "https://www.thenestapp.space/insights/mirror?notification=mirror",
          }),
      }
    );

  if (
    !response.ok
  ) {
    console.error(
      "MIRROR PUSH ERROR:",
      response.status,
      await response.text()
    );

    return false;
  }

  return true;
}

async function handleRunMirrorAnalysis(
  req: VercelRequest,
  res: VercelResponse
) {
  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return res
      .status(405)
      .json({
        error:
          "Method not allowed",
      });
  }

  if (
    !isCronAuthorized(
      req
    )
  ) {
    return res
      .status(401)
      .json({
        error:
          "Unauthorized",
      });
  }

  const supabase =
    getSupabaseAdmin();

  if (
    !process.env
      .OPENAI_API_KEY
  ) {
    return res
      .status(500)
      .json({
        error:
          "OPENAI_API_KEY missing",
      });
  }

  const force =
    req.query.force ===
      "true" ||
    req.body?.force ===
      true;

  const backfill =
    req.query.backfill ===
      "true" ||
    req.body?.backfill ===
      true;

  const stats: JobStats = {
    checked: 0,
    generated: 0,
    skipped: 0,
    pushesSent: 0,
    errors: [],
  };

  try {
    const {
      data:
        profiles,

      error:
        profileError,
    } =
      await supabase
        .from(
          "profiles"
        )
        .select(
          "user_id, plan, subscription_status"
        )
        .eq(
          "plan",
          "supporter"
        )
        .limit(200);

    if (
      profileError
    ) {
      throw profileError;
    }

    for (
      const profile
      of profiles || []
    ) {
      const userId =
        String(
          profile.user_id
        );

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
            String(
              profile
                .subscription_status ||
                ""
            )
          )
        ) {
          stats.skipped +=
            1;

          continue;
        }

        const timezone =
          await getMirrorTimezone(
            supabase,
            userId
          );

        const local =
          getMirrorLocalNow(
            timezone
          );

        const {
          data: state,

          error:
            stateError,
        } =
          await supabase
            .from(
              "mirror_analysis_state"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .maybeSingle();

        if (
          stateError
        ) {
          throw stateError;
        }

        if (
          !force &&
          (
            local.hour !==
              3 ||
            state
              ?.last_checked_local_date ===
              local.date
          )
        ) {
          stats.skipped +=
            1;

          continue;
        }

        const recentStart =
          backfill
            ? new Date(
                Date.now() -
                  730 *
                    24 *
                    60 *
                    60 *
                    1000
              ).toISOString()

            : state
                ?.last_recent_entry_at ||
              new Date(
                Date.now() -
                  14 *
                    24 *
                    60 *
                    60 *
                    1000
              ).toISOString();
              const oldCutoff =
              new Date(
                Date.now() -
                  MIRROR_MIN_DAYS_APART *
                    24 *
                    60 *
                    60 *
                    1000
              ).toISOString();

        const oldStart =
          new Date(
            Date.now() -
              730 *
                24 *
                60 *
                60 *
                1000
          ).toISOString();

        const [
          recentResult,
          pastResult,
          previousResult,
        ] =
          await Promise.all(
            [
              supabase
                .from(
                  "memos"
                )
                .select(
                  "id, title, transcript_text, created_at"
                )
                .eq(
                  "user_id",
                  userId
                )
                .gt(
                  "created_at",
                  recentStart
                )
                .not(
                  "transcript_text",
                  "is",
                  null
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  backfill
                    ? 100
                    : 40
                ),

              supabase
                .from(
                  "memos"
                )
                .select(
                  "id, title, transcript_text, created_at"
                )
                .eq(
                  "user_id",
                  userId
                )
                .gte(
                  "created_at",
                  oldStart
                )
                .lte(
                  "created_at",
                  oldCutoff
                )
                .not(
                  "transcript_text",
                  "is",
                  null
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  backfill
                    ? 100
                    : 40
                ),

              supabase
                .from(
                  "mirror_generations"
                )
                .select(
                  "result"
                )
                .eq(
                  "user_id",
                  userId
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(20),
            ]
          );

        if (
          recentResult.error
        ) {
          throw recentResult.error;
        }

        if (
          pastResult.error
        ) {
          throw pastResult.error;
        }

        if (
          previousResult.error
        ) {
          throw previousResult.error;
        }

        const recentEntries: MirrorInputEntry[] =
          (
            recentResult.data ||
            []
          )
            .map(
              (
                memo: any
              ) => ({
                id:
                  String(
                    memo.id
                  ),

                title:
                  String(
                    memo.title ||
                      "Voice Capsule"
                  ),

                transcript:
                  String(
                    memo.transcript_text ||
                      ""
                  ).trim(),

                created_at:
                  String(
                    memo.created_at
                  ),
              })
            )
            .filter(
              (entry) =>
                entry.transcript
                  .length >=
                20
            );

        const pastEntries: MirrorInputEntry[] =
          (
            pastResult.data ||
            []
          )
            .map(
              (
                memo: any
              ) => ({
                id:
                  String(
                    memo.id
                  ),

                title:
                  String(
                    memo.title ||
                      "Voice Capsule"
                  ),

                transcript:
                  String(
                    memo.transcript_text ||
                      ""
                  ).trim(),

                created_at:
                  String(
                    memo.created_at
                  ),
              })
            )
            .filter(
              (entry) =>
                entry.transcript
                  .length >=
                20
            );

        const latestRecentDate =
          recentEntries[0]
            ?.created_at ||
          null;

        if (
          recentEntries.length ===
            0 ||
          pastEntries.length ===
            0
        ) {
          await supabase
            .from(
              "mirror_analysis_state"
            )
            .upsert(
              {
                user_id:
                  userId,

                timezone,

                last_checked_at:
                  new Date()
                    .toISOString(),

                last_checked_local_date:
                  local.date,

                last_recent_entry_at:
                  latestRecentDate ||
                  state
                    ?.last_recent_entry_at ||
                  null,
              },

              {
                onConflict:
                  "user_id",
              }
            );

          stats.skipped +=
            1;

          continue;
        }

        const previousMirrors =
          (
            previousResult.data ||
            []
          ).map(
            (
              row: any
            ) => ({
              title:
                String(
                  row.result
                    ?.title ||
                    ""
                ),

              reflection:
                String(
                  row.result
                    ?.reflection ||
                    ""
                ),

              past_entry_id:
                String(
                  row.result
                    ?.past_entry_id ||
                    ""
                ),

              recent_entry_id:
                String(
                  row.result
                    ?.recent_entry_id ||
                    ""
                ),
            })
          );

        const generated =
          await generateMirrorComparison(
            {
              recentEntries,
              pastEntries,
              previousMirrors,
            }
          );

        await supabase
          .from(
            "mirror_analysis_state"
          )
          .upsert(
            {
              user_id:
                userId,

              timezone,

              last_checked_at:
                new Date()
                  .toISOString(),

              last_checked_local_date:
                local.date,

              last_recent_entry_at:
                latestRecentDate,

              last_generated_at:
                generated.found
                  ? new Date()
                      .toISOString()
                  : state
                      ?.last_generated_at ||
                    null,
            },

            {
              onConflict:
                "user_id",
            }
          );

        if (
          !generated.found
        ) {
          stats.skipped +=
            1;

          continue;
        }

        const resultFingerprint =
          mirrorFingerprint(
            userId,
            generated
              .recent_entry_id,
            generated
              .past_entry_id,
            generated.title
          );

        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "mirror_generations"
            )
            .insert({
              user_id:
                userId,

              recent_entry_id:
                generated
                  .recent_entry_id,

              past_entry_id:
                generated
                  .past_entry_id,

              recent_date:
                generated
                  .recent_date,

              past_date:
                generated
                  .past_date,

              fingerprint:
                resultFingerprint,

              result: {
                title:
                  generated
                    .title,

                past:
                  generated
                    .past,

                present:
                  generated
                    .present,

                reflection:
                  generated
                    .reflection,

                past_entry_id:
                  generated
                    .past_entry_id,

                recent_entry_id:
                  generated
                    .recent_entry_id,

                past_date:
                  generated
                    .past_date,

                recent_date:
                  generated
                    .recent_date,

                confidence_score:
                  generated
                    .confidence_score,

                category:
                  generated
                    .category,
              },
            });

        if (
          insertError
        ) {
          if (
            insertError.code ===
            "23505"
          ) {
            stats.skipped +=
              1;

            continue;
          }

          throw insertError;
        }

        stats.generated +=
          1;

        const appId =
          process.env
            .ONESIGNAL_APP_ID;

        const apiKey =
          process.env
            .ONESIGNAL_REST_API_KEY;

        if (
          appId &&
          apiKey
        ) {
          const {
            data:
              preferences,
          } =
            await supabase
              .from(
                "notification_preferences"
              )
              .select(
                "onesignal_subscription_id"
              )
              .eq(
                "user_id",
                userId
              )
              .eq(
                "enabled",
                true
              )
              .not(
                "onesignal_subscription_id",
                "is",
                null
              );

          const sent =
            await sendMirrorPush(
              {
                appId,
                apiKey,

                subscriptionIds:
                  (
                    preferences ||
                    []
                  ).map(
                    (
                      item: any
                    ) =>
                      String(
                        item.onesignal_subscription_id ||
                          ""
                      )
                  ),
              }
            );

          if (sent) {
            stats.pushesSent +=
              1;
          }
        }
      } catch (
        error: any
      ) {
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

    return res
      .status(200)
      .json({
        ok: true,
        stats,
      });
  } catch (error: any) {
    console.error(
      "RUN MIRROR ANALYSIS ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          error.message ||
          "Mirror analysis failed.",

        stats,
      });
  }
}

/* =========================================================
   SINGLE VERCEL HANDLER / ROUTER
========================================================= */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const action =
      getAction(req);

    switch (action) {
      case "daily-reminder":
        return await handleDailyReminder(
          req,
          res
        );

      case "generate-memo-title":
        return await handleGenerateMemoTitle(
          req,
          res
        );

      case "generate-mirror":
        return await handleGenerateMirror(
          req,
          res
        );

      case "generate-reflection":
        return await handleGenerateReflection(
          req,
          res
        );

      case "run-mirror-analysis":
        return await handleRunMirrorAnalysis(
          req,
          res
        );

      default:
        return res
          .status(400)
          .json({
            ok: false,

            error:
              `Unknown action: ${action}`,

            availableActions: [
              "daily-reminder",
              "generate-memo-title",
              "generate-mirror",
              "generate-reflection",
              "run-mirror-analysis",
            ],
          });
    }
  } catch (error: any) {
    console.error(
      "DAILY REMINDER ROUTER ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          String(
            error?.message ||
              error
          ),
      });
  }
}
