import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `
You are The Nest weekly reflection AI.
Only use the provided entries.
Do not invent facts.
Analyze exactly the provided week range only.
You choose all highlights, challenges, emojis, emotional journey, what changed, moments, reflection and suggestion.
Return valid JSON only.
No markdown.
        `,
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Create a weekly reflection from these entries.",
          range_start: body.range_start,
          range_end: body.range_end,
          entries: body.entries,
          schema: {
            story: "string",
            wins: ["string"],
            challenges: ["string"],
            emotional_journey: [
              {
                day: "string",
                mood: "string",
                emoji: "string",
                note: "string",
                chart_score: "number 0-100",
              },
            ],
            what_changed: [
              {
                label: "string",
                direction: "up | down | same",
                emoji: "string",
                reason: "string",
              },
            ],
            moments: [
              {
                date: "string",
                quote: "short exact quote from entry",
                emoji: "string",
              },
            ],
            gentle_reflection: "string",
            next_suggestion: "string",
          },
        }),
      },
    ],
    response_format: { type: "json_object" },
  });

  return Response.json(JSON.parse(completion.choices[0].message.content || "{}"));
}