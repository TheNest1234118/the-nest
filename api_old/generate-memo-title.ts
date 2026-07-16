import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const text = String(req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.75,
    response_format: { type: "json_object" },
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
        content: text.slice(0, 4000),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  return res.status(200).json({
    titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 5) : [],
  });
}