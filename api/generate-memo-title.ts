import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Missing text" });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "Create a short, natural title for a voice memo. Max 6 words. No quotes. Return only the title.",
      },
      {
        role: "user",
        content: text.slice(0, 3000),
      },
    ],
  });

  res.status(200).json({
    title: result.choices[0]?.message?.content?.trim() || "Voice capsule",
  });
}