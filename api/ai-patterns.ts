import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

export const config = {
  maxDuration: 300,
};

type PatternEntry = {
  id: string;
  type: "thought" | "voice" | "mood" | "reflection";
  title?: string;
  text?: string;
  transcript?: string;
  mood?: string;
  created_at: string;
};

type PreviousInsight = {
  title?: string;
  description?: string;
  category?: string;
  type?: string;
};

type AnalyzePatternsInput = {
  newEntries: PatternEntry[];
  comparisonEntries?: PatternEntry[];
  previousInsights?: PreviousInsight[];
};

const SYSTEM_PROMPT = `
You are the automatic pattern recognition engine for The Nest,
a private journaling and voice reflection app.

Your task is to find only genuinely new, meaningful and well-supported
insights in a user's recent entries.

You are not a therapist.
You must never diagnose.
You must never invent facts.
You must only use the supplied entries.

IMPORTANT:
- Analyze the NEW entries.
- Compare them with the OLDER comparison entries.
- Compare the result with PREVIOUS insights.
- Do not repeat an existing insight using different wording.
- Ignore weak, generic, obvious or uncertain observations.
- Return at most 3 insights.
- Returning zero insights is completely acceptable.
- Every insight requires at least 2 supporting entries.
- Prefer evidence across different days.
- Use high confidence only when evidence is strong and repeated.
- Keep the language warm, human, calm and specific.
- Do not sound clinical or like a research report.
- Do not give generic motivational advice.
- Do not flatter the user.
- Use the same language as the majority of the user's entries.

Good insights:
- "Your future has been showing up more often."
- "Work feels less present than it did last month."
- "Your best ideas keep appearing late at night."
- "Family has returned to your thoughts recently."

Bad insights:
- "You have emotions."
- "You sometimes feel stressed."
- "You should practice mindfulness."
- "A cycle of psychological dysregulation is present."

A new_pattern means a topic or behavior has newly appeared and is recurring.
A change means a meaningful increase, decrease or shift compared with older entries.
A recurring_pattern means it is repeatedly present without a clear recent change.

Return valid JSON only.
`;

const responseSchema = {
  name: "automatic_ai_patterns",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "hero_themes", "patterns"],
    properties: {
      summary: {
        type: "string",
      },
      hero_themes: {
        type: "array",
        maxItems: 3,
        items: {
          type: "string",
        },
      },
      patterns: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "title",
            "type",
            "category",
            "change_type",
            "confidence",
            "confidence_score",
            "confidence_reason",
            "description",
            "evidence",
            "suggestion",
          ],
          properties: {
            id: {
              type: "string",
            },
            title: {
              type: "string",
            },
            type: {
              type: "string",
              enum: [
                "recurring_topic",
                "emotional_pattern",
                "creative_pattern",
                "stress_pattern",
                "growth_pattern",
                "avoidance_pattern",
                "habit_pattern",
                "time_of_day_pattern",
                "positive_change",
                "negative_loop",
                "stopped_mentioning",
                "recently_started",
              ],
            },
            category: {
              type: "string",
              enum: [
                "emotion",
                "work",
                "relationships",
                "family",
                "sleep",
                "health",
                "motivation",
                "creativity",
                "habits",
                "identity",
                "future",
                "stress",
                "other",
              ],
            },
            change_type: {
              type: "string",
              enum: [
                "new_pattern",
                "change",
                "recurring_pattern",
              ],
            },
            confidence: {
              type: "string",
              enum: ["medium", "high"],
            },
            confidence_score: {
              type: "integer",
              minimum: 60,
              maximum: 100,
            },
            confidence_reason: {
              type: "string",
            },
            description: {
              type: "string",
            },
            evidence: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "entry_id",
                  "entry_type",
                  "date",
                  "title",
                  "quote",
                  "mood",
                ],
                properties: {
                  entry_id: {
                    type: "string",
                  },
                  entry_type: {
                    type: "string",
                    enum: [
                      "thought",
                      "voice",
                      "mood",
                      "reflection",
                    ],
                  },
                  date: {
                    type: "string",
                  },
                  title: {
                    type: "string",
                  },
                  quote: {
                    type: "string",
                  },
                  mood: {
                    type: "string",
                  },
                },
              },
            },
            suggestion: {
              type: "string",
            },
          },
        },
      },
    },
  },
};

function getEntryContent(entry: PatternEntry) {
  return String(
    entry.transcript ||
      entry.text ||
      entry.title ||
      ""
  ).trim();
}

function sanitizeEntries(entries: unknown): PatternEntry[] {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry): entry is PatternEntry => {
      if (!entry || typeof entry !== "object") return false;

      const item = entry as PatternEntry;

      return Boolean(
        item.id &&
          item.type &&
          item.created_at &&
          getEntryContent(item)
      );
    })
    .map((entry) => ({
      id: String(entry.id),
      type: entry.type,
      title: String(entry.title || ""),
      text: String(entry.text || ""),
      transcript: String(entry.transcript || ""),
      mood: String(entry.mood || ""),
      created_at: String(entry.created_at),
    }))
    .slice(0, 120);
}

function sanitizePreviousInsights(value: unknown): PreviousInsight[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      title: String(item.title || ""),
      description: String(item.description || ""),
      category: String(item.category || ""),
      type: String(item.type || ""),
    }))
    .slice(0, 50);
}

function normalizeResult(parsed: any) {
  const patterns = Array.isArray(parsed?.patterns)
    ? parsed.patterns
        .filter((pattern: any) => {
          return (
            pattern &&
            Array.isArray(pattern.evidence) &&
            pattern.evidence.length >= 2 &&
            Number(pattern.confidence_score) >= 60
          );
        })
        .slice(0, 3)
    : [];

  const heroThemes = Array.isArray(parsed?.hero_themes)
    ? parsed.hero_themes
        .filter((theme: unknown) => typeof theme === "string")
        .slice(0, 3)
    : [];

  return {
    summary:
      typeof parsed?.summary === "string"
        ? parsed.summary
        : "",
    hero_themes: heroThemes,
    patterns,
  };
}

export async function analyzePatterns({
  newEntries,
  comparisonEntries = [],
  previousInsights = [],
}: AnalyzePatternsInput) {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const cleanNewEntries = sanitizeEntries(newEntries);
  const cleanComparisonEntries =
    sanitizeEntries(comparisonEntries);
  const cleanPreviousInsights =
    sanitizePreviousInsights(previousInsights);

  if (cleanNewEntries.length === 0) {
    return {
      summary: "",
      hero_themes: [],
      patterns: [],
    };
  }

  const openai = new OpenAI({
    apiKey: openaiKey,
  });

  const userPrompt = `
Find genuinely new personal insights from the recent entries.

NEW ENTRIES:
These entries have not been analyzed before.

${JSON.stringify(cleanNewEntries)}

OLDER COMPARISON ENTRIES:
Use these only to determine whether something has changed,
increased, decreased, stopped or newly appeared.

${JSON.stringify(cleanComparisonEntries)}

PREVIOUSLY SAVED INSIGHTS:
Do not repeat these insights or return close paraphrases.

${JSON.stringify(cleanPreviousInsights)}

Rules:
- Analyze primarily the new entries.
- Compare them with older entries when useful.
- Do not repeat previous insights.
- Return at most 3 insights.
- Return zero insights when nothing meaningful is new.
- Every insight needs at least 2 real evidence entries.
- Each quote must be short and taken from an entry.
- Evidence must reference valid supplied entry IDs.
- Description: maximum 2 short sentences.
- Suggestion: one specific reflection question or small action.
- Ignore weak, speculative or generic patterns.
- Confidence score below 60 must not be returned.
`;

  const completion =
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: responseSchema,
      },
    });

  const raw =
    completion.choices[0]?.message?.content || "{}";

  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  return normalizeResult(parsed);
}

function isAuthorizedInternalRequest(
  req: VercelRequest
) {
  const expected =
    process.env.AI_PATTERNS_INTERNAL_SECRET ||
    process.env.CRON_SECRET;

  if (!expected) return false;

  const authorization =
    typeof req.headers.authorization === "string"
      ? req.headers.authorization
      : "";

  const headerSecret =
    typeof req.headers["x-internal-secret"] === "string"
      ? req.headers["x-internal-secret"]
      : "";

  return (
    authorization === `Bearer ${expected}` ||
    headerSecret === expected
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Method not allowed" });
  }

  try {
    if (!isAuthorizedInternalRequest(req)) {
      return res
        .status(401)
        .json({ error: "Unauthorized" });
    }

    const result = await analyzePatterns({
      newEntries: req.body?.newEntries || [],
      comparisonEntries:
        req.body?.comparisonEntries || [],
      previousInsights:
        req.body?.previousInsights || [],
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("AI PATTERNS ERROR:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Could not analyze AI patterns.",
    });
  }
}