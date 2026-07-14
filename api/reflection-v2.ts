import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";
import OpenAI from "openai";

export const config = {
  maxDuration: 60,
};

const emptyReflection = {
  digest_title: "",
  story: "",
  biggest_change: "",
  quote_of_the_week: "",
  integrated_insight: null,

  wins: [],
  challenges: [],
  emotional_journey: [],
  what_changed: [],
  moments: [],

  gentle_reflection: "",
  next_suggestion: "",
  suggestions: [],
  one_small_step: "",
  closing_sentence: "",

  monthly_themes: [],
  month_growth: [],
};

const schema = {
  name: "the_nest_digest_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "digest_title",
      "story",
      "biggest_change",
      "quote_of_the_week",
      "integrated_insight",
      "wins",
      "challenges",
      "emotional_journey",
      "what_changed",
      "moments",
      "gentle_reflection",
      "next_suggestion",
      "suggestions",
      "one_small_step",
      "closing_sentence",
      "monthly_themes",
      "month_growth",
    ],
    properties: {
      digest_title: {
        type: "string",
      },

      story: {
        type: "string",
      },

      biggest_change: {
        type: "string",
      },

      quote_of_the_week: {
        type: "string",
      },

      integrated_insight: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "explanation",
              "supporting_entry_ids",
            ],
            properties: {
              title: {
                type: "string",
              },
              explanation: {
                type: "string",
              },
              supporting_entry_ids: {
                type: "array",
                minItems: 2,
                maxItems: 5,
                items: {
                  type: "string",
                },
              },
            },
          },
          {
            type: "null",
          },
        ],
      },

      wins: {
        type: "array",
        maxItems: 4,
        items: {
          type: "string",
        },
      },

      challenges: {
        type: "array",
        maxItems: 4,
        items: {
          type: "string",
        },
      },

      emotional_journey: {
        type: "array",
        minItems: 7,
        maxItems: 7,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "day",
            "has_entry",
            "mood",
            "emoji",
            "note",
            "chart_score",
          ],
          properties: {
            day: {
              type: "string",
              enum: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
            },

            has_entry: {
              type: "boolean",
            },

            mood: {
              type: "string",
            },

            emoji: {
              type: "string",
            },

            note: {
              type: "string",
            },

            chart_score: {
              anyOf: [
                {
                  type: "number",
                  minimum: 1,
                  maximum: 10,
                },
                {
                  type: "null",
                },
              ],
            },
          },
        },
      },

      what_changed: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "label",
            "direction",
            "emoji",
            "reason",
          ],
          properties: {
            label: {
              type: "string",
            },

            direction: {
              type: "string",
              enum: ["up", "down", "same"],
            },

            emoji: {
              type: "string",
            },

            reason: {
              type: "string",
            },
          },
        },
      },

      moments: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "entry_id",
            "date",
            "quote",
            "emoji",
          ],
          properties: {
            entry_id: {
              type: "string",
            },

            date: {
              type: "string",
            },

            quote: {
              type: "string",
            },

            emoji: {
              type: "string",
            },
          },
        },
      },

      gentle_reflection: {
        type: "string",
      },

      next_suggestion: {
        type: "string",
      },

      suggestions: {
        type: "array",
        maxItems: 3,
        items: {
          type: "string",
        },
      },

      one_small_step: {
        type: "string",
      },

      closing_sentence: {
        type: "string",
      },

      monthly_themes: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "importance",
            "mentions",
            "change",
          ],
          properties: {
            title: {
              type: "string",
            },

            importance: {
              type: "string",
            },

            mentions: {
              type: "integer",
              minimum: 1,
            },

            change: {
              type: "string",
            },
          },
        },
      },

      month_growth: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "value"],
          properties: {
            label: {
              type: "string",
            },

            value: {
              type: "string",
            },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `
You are The Nest.

The Nest is not a therapist.
The Nest is not a life coach.
The Nest is a calm observer.

It notices patterns and reflects them back honestly.
Never manipulate emotions.
Never create drama.
Always stay grounded in what the user's recordings actually contain.

Your job is to create The Nest Digest.

The Nest Digest is not a technical summary.
It is a short narrative chapter about the user's week or month.

The user should feel like someone observed their life carefully.

Rules:
- Only use the supplied entries.
- Never invent facts.
- Never invent events.
- Never invent quotes.
- Never use outside knowledge.
- Never diagnose.
- Never give medical advice.
- Never exaggerate.
- Never flatter.
- Never use motivational clichés.
- Never pretend to know how the user feels unless their entries support it.
- Use the same language as the majority of the supplied entries.
- If the entries are mixed, use the language that appears most often.
- Keep all observations grounded and explainable.
- Return valid JSON only.

Writing style:
- calm
- reflective
- beautiful
- minimal
- human
- specific
- emotionally intelligent
- never dramatic
- never clinical
- never like ChatGPT

DIGEST TITLE:
Create a short, human title for this chapter.
Do not use generic titles like:
- Weekly Reflection
- Your Week
- Weekly Summary

Good examples:
- "A week of uncertainty and small progress"
- "The future kept returning"
- "Quiet movement beneath the surface"

STORY:
Do not write a list.
Do not simply summarize each entry.
Write a narrative with 3 to 6 short paragraphs.
Maximum 350 words.

The narrative should naturally include:
- the thought or subject that kept returning
- the biggest challenge
- the most meaningful positive moment
- the biggest change
- one meaningful exact quote when appropriate

BIGGEST CHANGE:
Return one short grounded sentence describing the clearest shift.
Return an empty string if there is no supported change.

QUOTE OF THE WEEK:
Return one short exact quote from a supplied entry.
Do not rewrite it.
Return an empty string if no meaningful quote exists.

INTEGRATED INSIGHT:
Return one observation only when:
- it is supported by at least two entries
- it is meaningful
- it is not obvious or generic
- it helps the user notice something about their week or month

Otherwise return null.

WINS:
Return only real highlights supported by supplied entries.
Do not manufacture achievements.

CHALLENGES:
Return only challenges directly supported by supplied entries.

EMOTIONAL JOURNEY:
Return exactly seven objects:
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday

For a day with no supplied entry:
- has_entry must be false
- mood must be ""
- emoji must be ""
- note must be ""
- chart_score must be null

Never invent a mood for an empty day.

For a day with entries:
- has_entry must be true
- describe the day carefully
- chart_score must be between 1 and 10
- do not claim clinical emotion recognition

WHAT CHANGED:
Return only changes supported by the entries.
The direction means:
- up: the subject, feeling or behavior became more present
- down: it became less present
- same: it remained consistently present

MOMENTS:
Every quote must be copied exactly from a supplied entry.
Every entry_id must match a supplied entry ID.

SUGGESTIONS:
Suggestions must be small, calm and connected to the actual entries.
Avoid generic advice.

ONE SMALL STEP:
Return one realistic action based directly on what appeared in the entries.
It may be an empty string if no natural action follows.

CLOSING SENTENCE:
End with one calm, memorable sentence.
Do not use motivational clichés.
`;

function sanitizeEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const item = entry as any;

      const content = String(
        item.transcript ||
          item.text ||
          item.note ||
          item.mood ||
          item.title ||
          ""
      ).trim();

      return Boolean(
        item.id &&
          item.type &&
          item.date &&
          content
      );
    })
    .map((entry: any) => ({
      id: String(entry.id),
      type: String(entry.type),
      date: String(entry.date),
      title: String(entry.title || ""),
      text: String(entry.text || ""),
      transcript: String(
        entry.transcript || ""
      ),
      mood: String(entry.mood || ""),
      note: String(entry.note || ""),
    }))
    .slice(0, 150);
}

function normalizeResult(
  parsed: any,
  entries: Array<{
    id: string;
    type: string;
    date: string;
  }>
) {
  const validEntryIds = new Set(
    entries.map((entry) => entry.id)
  );

  const emotionalJourney = Array.isArray(
    parsed?.emotional_journey
  )
    ? parsed.emotional_journey.slice(0, 7)
    : [];

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const normalizedJourney = days.map((day) => {
    const found = emotionalJourney.find(
      (item: any) =>
        String(item?.day || "").toLowerCase() ===
        day.toLowerCase()
    );

    if (!found) {
      return {
        day,
        has_entry: false,
        mood: "",
        emoji: "",
        note: "",
        chart_score: null,
      };
    }

    if (found.has_entry === false) {
      return {
        day,
        has_entry: false,
        mood: "",
        emoji: "",
        note: "",
        chart_score: null,
      };
    }

    const rawScore = Number(
      found.chart_score
    );

    return {
      day,
      has_entry: true,
      mood: String(found.mood || ""),
      emoji: String(found.emoji || ""),
      note: String(found.note || ""),
      chart_score: Number.isFinite(rawScore)
        ? Math.min(10, Math.max(1, rawScore))
        : 5,
    };
  });

  const moments = Array.isArray(parsed?.moments)
    ? parsed.moments
        .filter((moment: any) => {
          return (
            moment &&
            validEntryIds.has(
              String(moment.entry_id)
            ) &&
            String(moment.quote || "").trim()
          );
        })
        .slice(0, 4)
    : [];

  let integratedInsight =
    parsed?.integrated_insight || null;

  if (integratedInsight) {
    const supportingEntryIds = Array.isArray(
      integratedInsight.supporting_entry_ids
    )
      ? integratedInsight.supporting_entry_ids
          .map((id: unknown) => String(id))
          .filter((id: string) =>
            validEntryIds.has(id)
          )
      : [];

    if (supportingEntryIds.length < 2) {
      integratedInsight = null;
    } else {
      integratedInsight = {
        title: String(
          integratedInsight.title || ""
        ).trim(),
        explanation: String(
          integratedInsight.explanation || ""
        ).trim(),
        supporting_entry_ids:
          supportingEntryIds.slice(0, 5),
      };
    }
  }

  return {
    ...emptyReflection,

    digest_title: String(
      parsed?.digest_title || ""
    ).trim(),

    story: String(
      parsed?.story || ""
    ).trim(),

    biggest_change: String(
      parsed?.biggest_change || ""
    ).trim(),

    quote_of_the_week: String(
      parsed?.quote_of_the_week || ""
    ).trim(),

    integrated_insight: integratedInsight,

    wins: Array.isArray(parsed?.wins)
      ? parsed.wins
          .map((item: unknown) =>
            String(item).trim()
          )
          .filter(Boolean)
          .slice(0, 4)
      : [],

    challenges: Array.isArray(
      parsed?.challenges
    )
      ? parsed.challenges
          .map((item: unknown) =>
            String(item).trim()
          )
          .filter(Boolean)
          .slice(0, 4)
      : [],

    emotional_journey: normalizedJourney,

    what_changed: Array.isArray(
      parsed?.what_changed
    )
      ? parsed.what_changed.slice(0, 4)
      : [],

    moments,

    gentle_reflection: String(
      parsed?.gentle_reflection || ""
    ).trim(),

    next_suggestion: String(
      parsed?.next_suggestion || ""
    ).trim(),

    suggestions: Array.isArray(
      parsed?.suggestions
    )
      ? parsed.suggestions
          .map((item: unknown) =>
            String(item).trim()
          )
          .filter(Boolean)
          .slice(0, 3)
      : [],

    one_small_step: String(
      parsed?.one_small_step || ""
    ).trim(),

    closing_sentence: String(
      parsed?.closing_sentence || ""
    ).trim(),

    monthly_themes: Array.isArray(
      parsed?.monthly_themes
    )
      ? parsed.monthly_themes.slice(0, 5)
      : [],

    month_growth: Array.isArray(
      parsed?.month_growth
    )
      ? parsed.month_growth.slice(0, 5)
      : [],
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

  try {
    const openaiKey =
      process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY missing",
      });
    }

    const {
      kind,
      range_start,
      range_end,
      entries,
    } = req.body || {};

    if (
      kind !== "weekly" &&
      kind !== "monthly"
    ) {
      return res.status(400).json({
        error: "Invalid reflection kind",
      });
    }

    const cleanEntries =
      sanitizeEntries(entries);

    if (cleanEntries.length < 3) {
      return res
        .status(200)
        .json(emptyReflection);
    }

    const openai = new OpenAI({
      apiKey: openaiKey,
    });

    const task =
      kind === "weekly"
        ? `
Create The Nest Digest for this exact week.

Write it as a chapter of the user's week.
Do not call it a Weekly Reflection.
Do not write a chronological diary recap.
Focus on meaning, change and recurring thoughts.

The user should feel:
"This is the story of my week."
`
        : `
Create a monthly chapter from the supplied entries.

Do not write a technical monthly report.
Describe the month as a meaningful chapter.
Include broader themes and changes that are supported across the month.

The user should feel:
"I can finally see how this month changed me."
`;

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: schema,
        },
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify({
              task,
              kind,
              range_start,
              range_end,
              entries: cleanEntries,
            }),
          },
        ],
      });

    const raw =
      completion.choices[0]?.message
        ?.content || "{}";

    let parsed: any;

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "OpenAI returned invalid JSON"
      );
    }

    const result = normalizeResult(
      parsed,
      cleanEntries
    );

    return res.status(200).json(result);
  } catch (error: any) {
    console.error(
      "THE NEST DIGEST ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Could not create The Nest Digest.",
    });
  }
}