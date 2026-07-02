const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  const { kind, entries, previous } = req.body || {};

  const system = `
You create private reflections for The Nest.
Be warm, specific, grounded and emotionally intelligent.
Never diagnose. Never invent. Never exaggerate.
Use only the provided entries.
Return valid JSON only.
`;

  const prompt =
    kind === "weekly"
      ? `
Create a Weekly Reflection from the last 7 days.

Goal: help the user understand what shaped their week.

Return:
{
 "story": "max 200 words",
 "wins": ["3 grounded wins"],
 "challenges": ["3 grounded challenges"],
 "emotional_journey": [{"day":"Monday","mood":"emoji or word","note":"short"}],
 "what_changed": [{"label":"Stress","direction":"up|down|same"}],
 "moments": [{"entry_id":"id","date":"YYYY-MM-DD","quote":"short quote"}],
 "gentle_reflection": "one thoughtful paragraph",
 "next_suggestion": "one personalized suggestion"
}

Entries:
${JSON.stringify(entries)}
Previous:
${JSON.stringify(previous)}
`
      : `
Create a Monthly Reflection.

Question: Who did I become this month?

Return:
{
 "story": "max 300 words",
 "wins": ["5 meaningful highlights"],
 "challenges": ["3 grounded challenges"],
 "emotional_journey": [{"day":"Week 1","mood":"emoji or word","note":"short"}],
 "what_changed": [{"label":"Creativity","direction":"up|down|same"}],
 "moments": [{"entry_id":"id","date":"YYYY-MM-DD","quote":"short quote"}],
 "gentle_reflection": "what the user learned",
 "next_suggestion": "advice for next month",
 "monthly_themes": [{"title":"Product","importance":"high","mentions":4,"change":"up"}],
 "month_growth": [{"label":"Consistency","value":"+20%"}],
 "closing_sentence": "powerful screenshot-worthy sentence"
}

Entries:
${JSON.stringify(entries)}
Previous:
${JSON.stringify(previous)}
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
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const data = await openaiRes.json();
  if (!openaiRes.ok) return res.status(500).json({ error: data?.error?.message });

  try {
    return res.status(200).json(JSON.parse(data.choices[0].message.content));
  } catch {
    return res.status(500).json({ error: "Invalid JSON" });
  }
}