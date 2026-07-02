const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `
You are the pattern recognition engine for a private journaling app called The Nest.

Your job is to find meaningful, grounded patterns in the user's own entries.
You must never invent facts.
You must only use the provided entries.

The experience should feel human, warm, specific and emotionally intelligent.
Do not sound clinical.
Do not sound like a psychological report.
Do not diagnose.
Do not exaggerate.
Do not flatter.

Use careful language:
- "It seems..."
- "You often mention..."
- "This appears several times..."
- "This may be worth paying attention to..."

Avoid medical language.
Avoid generic advice.

Every pattern must include at least two evidence entries.
If there is not enough evidence, do not generate that pattern.

Pattern titles must feel human.
Examples:
Good: "Sleep keeps showing up."
Good: "Family has been on your mind lately."
Good: "Your best ideas appear late at night."
Bad: "Cycle of Stress and Physical Symptoms"
Bad: "Conflict with Family Dynamics"

Return valid JSON only.
`;

const schema = {
  name: "ai_patterns_response_v2",
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
        minItems: 1,
        maxItems: 4,
        items: { type: "string" },
      },
      patterns: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "title",
            "type",
            "confidence",
            "confidence_reason",
            "description",
            "evidence",
            "suggestion",
          ],
          properties: {
            id: { type: "string" },
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
                  entry_id: { type: "string" },
                  entry_type: {
                    type: "string",
                    enum: ["thought", "voice", "mood", "reflection"],
                  },
                  date: { type: "string" },
                  title: { type: "string" },
                  quote: { type: "string" },
                  mood: { type: "string" },
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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const { entries, range, previousGeneration } = req.body || {};

  if (!Array.isArray(entries) || entries.length < 4) {
    return res.status(200).json({
      summary: "",
      hero_themes: [],
      patterns: [],
    });
  }

  const userPrompt = `
Analyze the following user entries and find meaningful personal patterns.

Core question:
"What keeps showing up in this user's life?"

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

Rules:
- Only use provided entries.
- Never invent missing facts.
- Do not diagnose mental health conditions.
- Do not use medical language.
- Do not make claims without evidence.
- Every pattern must include at least 2 real evidence entries.
- If there is not enough evidence for a pattern, do not include it.
- Keep descriptions concise: maximum 2 sentences.
- Keep the summary short.
- Pattern titles must sound warm, human and natural.
- Suggestions must be specific to the evidence.
- Avoid generic advice.

Hero:
Return hero_themes as 1 to 4 short themes the user keeps returning to.

Confidence:
Make confidence explainable.
confidence_reason should explain why confidence is high, medium or low.
Example:
"Detected in 6 entries across 18 days, including both voice capsules and thoughts."

Previous generation if available:
${previousGeneration ? JSON.stringify(previousGeneration) : "None"}

Time range:
${range}

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
    const parsed = JSON.parse(content);

    parsed.patterns = (parsed.patterns || []).filter(
      (pattern: any) => Array.isArray(pattern.evidence) && pattern.evidence.length >= 2
    );

    return res.status(200).json(parsed);
  } catch {
    return res.status(500).json({ error: "Invalid AI response" });
  }
}