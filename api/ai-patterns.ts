const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `
You are the pattern recognition engine for a private journaling app called The Nest.
Your job is to find meaningful, grounded patterns in the user's own entries.
You must never invent facts.
You must only use the provided entries.
You must be gentle, emotionally intelligent and specific.
Do not diagnose.
Do not exaggerate.
Do not flatter.
Every pattern must include evidence from actual entries.
Return valid JSON only.
`;

const schema = {
  name: "ai_patterns_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "patterns"],
    properties: {
      summary: { type: "string" },
      patterns: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "type",
            "confidence",
            "description",
            "evidence",
            "suggestion",
          ],
          properties: {
            title: { type: "string" },
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
            confidence: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
            description: { type: "string" },
            evidence: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["entry_id", "date", "quote"],
                properties: {
                  entry_id: { type: "string" },
                  date: { type: "string" },
                  quote: { type: "string" },
                },
              },
            },
            suggestion: { type: "string" },
          },
        },
      },
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const { entries, range } = req.body || {};

  if (!Array.isArray(entries) || entries.length < 3) {
    return res.status(200).json({
      summary: "",
      patterns: [],
    });
  }

  const userPrompt = `
Analyze the following user entries and find meaningful personal patterns.

Look for:
- recurring topics
- emotional loops
- repeated worries
- creative patterns
- changes over time
- things the user recently started mentioning
- things the user stopped mentioning
- times of day where certain thoughts appear
- positive shifts
- negative loops
- habits
- avoidance patterns

Return JSON only in this structure:
{
  "summary": "short overall summary",
  "patterns": [
    {
      "title": "short pattern title",
      "type": "one of the allowed pattern types",
      "confidence": "low | medium | high",
      "description": "2-3 sentence explanation",
      "evidence": [
        {
          "entry_id": "id",
          "date": "YYYY-MM-DD",
          "quote": "short quote from entry"
        }
      ],
      "suggestion": "one gentle practical suggestion"
    }
  ]
}

Rules:
- Only use provided entries.
- Do not invent missing facts.
- Do not diagnose mental health conditions.
- Do not make claims without evidence.
- Keep quotes short.
- Make insights feel personal, useful and grounded.
- Time range: ${range}

Entries:
${JSON.stringify(entries)}
`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
    }),
  });

  const data = await openaiRes.json();

  if (!openaiRes.ok) {
    return res.status(500).json({
      error: data?.error?.message || "OpenAI request failed",
    });
  }

  const content = data.choices?.[0]?.message?.content;

  try {
    return res.status(200).json(JSON.parse(content));
  } catch {
    return res.status(500).json({ error: "Invalid AI response" });
  }
}