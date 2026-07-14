import OpenAI from "openai";

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
You are The Nest.

The Nest is not a therapist.
The Nest is not a life coach.
The Nest is a calm observer.

It notices patterns and reflects them back honestly.
Never manipulate emotions.
Never create drama.
Always stay grounded in what the user's recordings actually contain.

Your task is to find ONE meaningful insight from the user's recent entries.

Do not summarize everything.

Instead, notice one thing the user may not have noticed themselves.

Focus on:
- repeated people
- repeated places
- repeated emotions
- repeated goals
- repeated worries
- recurring habits
- changes over time
- contradictions
- language changes
- optimism versus pessimism
- confidence changes
- changing priorities
- subjects that appeared recently
- subjects that stopped appearing
- differences between recent and older entries

The insight must feel:
- surprising
- personal
- useful
- calm
- warm
- minimal
- thoughtful

The user should feel:
"How did it notice that?"

Rules:
- Analyze the NEW entries first.
- Use OLDER entries only for meaningful comparison.
- Compare against PREVIOUS insights.
- Never repeat an old insight using different wording.
- Never invent information.
- Never invent quotes.
- Never diagnose.
- Never exaggerate.
- Never flatter.
- Never make dramatic claims.
- Never claim certainty about emotions.
- Never give generic self-help advice.
- Return exactly zero or one insight.
- Returning zero insights is correct when nothing meaningful is supported.
- One insight requires evidence from at least two supplied entries.
- Prefer evidence from different days.
- The main description must contain no more than 60 words.
- Use the language used by the majority of the user's entries.
- Evidence quotes must be short and taken directly from supplied entries.

Good examples:
- "This is the fourth time this week you've mentioned your father."
- "You sound calmer than you did a month ago."
- "Your thoughts have shifted from worrying about the future to talking about building it."
- "The word 'finally' appears much more often than it used to."
- "Family has started appearing more often than work."

Bad examples:
- "You have emotions."
- "You sometimes feel stressed."
- "You should practice mindfulness."
- "You are experiencing psychological dysregulation."
- "Everything is going to be okay."

Definitions:
- new_pattern: something newly appearing across several recent entries
- change: a supported increase, decrease or shift compared with older entries
- recurring_pattern: something repeatedly present without a clear recent shift
- contrast: a meaningful difference between past and present
- stopped_pattern: something important that used to appear and has become absent

Life Themes are broader recurring parts of the user's life.
Examples:
- Family
- Work
- Future
- Love
- Creativity
- Health
- Identity

Life Themes must also be grounded in supplied entries.
Do not create a theme from a single weak mention.

Return valid JSON only.
`;

const responseSchema = {
  name: "the_nest_noticed_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "summary",
      "hero_themes",
      "patterns",
      "life_themes",
    ],
    properties: {
      summary: {
        type: "string",
      },

      hero_themes: {
        type: "array",
        maxItems: 4,
        items: {
          type: "string",
        },
      },

      patterns: {
        type: "array",
        maxItems: 1,
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
                "relationship_pattern",
                "language_shift",
                "confidence_change",
                "priority_change",
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
                "confidence",
                "language",
                "priorities",
                "other",
              ],
            },

            change_type: {
              type: "string",
              enum: [
                "new_pattern",
                "change",
                "recurring_pattern",
                "contrast",
                "stopped_pattern",
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

      life_themes: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "name",
            "category",
            "mention_count",
            "strength",
            "direction",
            "description",
            "supporting_entry_ids",
          ],
          properties: {
            id: {
              type: "string",
            },

            name: {
              type: "string",
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
                "confidence",
                "language",
                "priorities",
                "other",
              ],
            },

            mention_count: {
              type: "integer",
              minimum: 2,
            },

            strength: {
              type: "integer",
              minimum: 0,
              maximum: 100,
            },

            direction: {
              type: "string",
              enum: [
                "rising",
                "falling",
                "stable",
                "new",
              ],
            },

            description: {
              type: "string",
            },

            supporting_entry_ids: {
              type: "array",
              minItems: 2,
              maxItems: 10,
              items: {
                type: "string",
              },
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
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry): entry is PatternEntry => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

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

function sanitizePreviousInsights(
  value: unknown
): PreviousInsight[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        Boolean(item) &&
        typeof item === "object"
    )
    .map((item: any) => ({
      title: String(item.title || ""),
      description: String(
        item.description || ""
      ),
      category: String(item.category || ""),
      type: String(item.type || ""),
    }))
    .slice(0, 50);
}

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function limitWords(value: string, maxWords: number) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= maxWords) {
    return value.trim();
  }

  return `${words.slice(0, maxWords).join(" ")}…`;
}

function normalizeResult(
  parsed: any,
  allEntries: PatternEntry[]
) {
  const validEntryIds = new Set(
    allEntries.map((entry) => String(entry.id))
  );

  const rawPatterns = Array.isArray(
    parsed?.patterns
  )
    ? parsed.patterns
    : [];

  const patterns = rawPatterns
    .map((pattern: any) => {
      const evidence = Array.isArray(
        pattern?.evidence
      )
        ? pattern.evidence
            .filter((item: any) => {
              return (
                item &&
                validEntryIds.has(
                  String(item.entry_id)
                ) &&
                String(item.quote || "").trim()
              );
            })
            .slice(0, 5)
        : [];

      return {
        ...pattern,
        title: String(pattern?.title || "").trim(),
        description: limitWords(
          String(pattern?.description || ""),
          60
        ),
        confidence_score: Number(
          pattern?.confidence_score || 0
        ),
        evidence,
        suggestion: String(
          pattern?.suggestion || ""
        ).trim(),
      };
    })
    .filter((pattern: any) => {
      return (
        pattern.title &&
        pattern.description &&
        pattern.evidence.length >= 2 &&
        pattern.confidence_score >= 60
      );
    })
    .slice(0, 1);

  const rawLifeThemes = Array.isArray(
    parsed?.life_themes
  )
    ? parsed.life_themes
    : [];

  const lifeThemes = rawLifeThemes
    .map((theme: any) => {
      const supportingEntryIds = Array.isArray(
        theme?.supporting_entry_ids
      )
        ? theme.supporting_entry_ids
            .map((id: unknown) => String(id))
            .filter((id: string) =>
              validEntryIds.has(id)
            )
            .slice(0, 10)
        : [];

      return {
        ...theme,
        id: String(theme?.id || "").trim(),
        name: String(theme?.name || "").trim(),
        mention_count: Math.max(
          Number(theme?.mention_count || 0),
          supportingEntryIds.length
        ),
        strength: Math.min(
          100,
          Math.max(
            0,
            Number(theme?.strength || 0)
          )
        ),
        description: String(
          theme?.description || ""
        ).trim(),
        supporting_entry_ids:
          supportingEntryIds,
      };
    })
    .filter((theme: any) => {
      return (
        theme.name &&
        theme.supporting_entry_ids.length >= 2
      );
    })
    .slice(0, 5);

  const heroThemes = Array.isArray(
    parsed?.hero_themes
  )
    ? parsed.hero_themes
        .filter(
          (theme: unknown) =>
            typeof theme === "string" &&
            theme.trim()
        )
        .map((theme: string) =>
          theme.trim()
        )
        .slice(0, 4)
    : [];

  const summary =
    patterns.length > 0
      ? String(
          parsed?.summary ||
            patterns[0].description
        ).trim()
      : "";

  return {
    summary,
    hero_themes: heroThemes,
    patterns,
    life_themes: lifeThemes,
  };
}

export async function analyzePatterns({
  newEntries,
  comparisonEntries = [],
  previousInsights = [],
}: AnalyzePatternsInput) {
  const openaiKey =
    process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    throw new Error(
      "OPENAI_API_KEY missing"
    );
  }

  const cleanNewEntries =
    sanitizeEntries(newEntries);

  const cleanComparisonEntries =
    sanitizeEntries(comparisonEntries);

  const cleanPreviousInsights =
    sanitizePreviousInsights(
      previousInsights
    );

  if (cleanNewEntries.length === 0) {
    return {
      summary: "",
      hero_themes: [],
      patterns: [],
      life_themes: [],
    };
  }

  const openai = new OpenAI({
    apiKey: openaiKey,
  });

  const userPrompt = `
Find ONE genuinely meaningful observation from the user's recent entries.

Do not summarize all entries.

The goal is to notice something the user may not have noticed.

NEW ENTRIES:
These entries have not been analyzed before.

${JSON.stringify(cleanNewEntries)}

OLDER COMPARISON ENTRIES:
Use these only when they support a real change, contrast, increase, decrease or disappearance.

${JSON.stringify(cleanComparisonEntries)}

PREVIOUSLY SAVED INSIGHTS:
Do not repeat these insights and do not return close paraphrases.

${JSON.stringify(cleanPreviousInsights)}

Requirements:
- Return zero or one insight.
- Return zero when nothing meaningful is strongly supported.
- Use at least two supplied entries as evidence.
- Prefer evidence from different dates.
- The description must be no more than 60 words.
- Do not summarize everything.
- Do not repeat an old insight.
- Do not invent quotes.
- Do not invent events.
- Do not diagnose.
- Do not exaggerate.
- Do not give generic advice.
- Keep the title human and natural.
- Keep the suggestion to one calm reflection question or one small observation.
- A suggestion may be an empty string when no natural suggestion follows.
- Confidence below 60 must not be returned.
- Evidence entry IDs must exactly match supplied IDs.
- Quotes must be short and copied from supplied entry text.
- Use the majority language of the entries.

Also identify up to five grounded Life Themes.
A Life Theme requires support from at least two entries.
Life Themes are broader recurring parts of the user's current life, not generic tags.

Possible themes include:
- Family
- Work
- Future
- Relationships
- Creativity
- Health
- Identity
- Motivation
- Sleep
- Home
- Money
- Friendship

The user should feel:
"How did it notice that?"
`;

  const completion =
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.15,
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

  return normalizeResult(parsed, [
    ...cleanNewEntries,
    ...cleanComparisonEntries,
  ]);
}