import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
export const config = {
 maxDuration: 60,
};
const emptyReflection = {
 story: "",
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
};
const schema = {
 name: "reflection_v2_response",
 strict: true,
 schema: {
   type: "object",
   additionalProperties: false,
   required: [
     "story",
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
   ],
   properties: {
     story: { type: "string" },
     wins: { type: "array", items: { type: "string" } },
     challenges: { type: "array", items: { type: "string" } },
     emotional_journey: {
       type: "array",
       items: {
         type: "object",
         additionalProperties: false,
         required: ["day", "has_entry", "mood", "emoji", "note", "chart_score"],
         properties: {
           day: { type: "string" },
           has_entry: { type: "boolean" },
           mood: { type: "string" },
           emoji: { type: "string" },
           note: { type: "string" },
           chart_score: {
             anyOf: [{ type: "number" }, { type: "null" }],
           },
         },
       },
     },
     what_changed: {
       type: "array",
       items: {
         type: "object",
         additionalProperties: false,
         required: ["label", "direction", "emoji", "reason"],
         properties: {
           label: { type: "string" },
           direction: {
             type: "string",
             enum: ["up", "down", "same"],
           },
           emoji: { type: "string" },
           reason: { type: "string" },
         },
       },
     },
     moments: {
       type: "array",
       items: {
         type: "object",
         additionalProperties: false,
         required: ["date", "quote", "emoji"],
         properties: {
           date: { type: "string" },
           quote: { type: "string" },
           emoji: { type: "string" },
         },
       },
     },
     gentle_reflection: { type: "string" },
     next_suggestion: { type: "string" },
     suggestions: {
       type: "array",
       items: { type: "string" },
     },
     one_small_step: { type: "string" },
     closing_sentence: { type: "string" },
   },
 },
};
export default async function handler(req: VercelRequest, res: VercelResponse) {
 if (req.method !== "POST") {
   return res.status(405).json({ error: "Method not allowed" });
 }
 try {
   const openaiKey = process.env.OPENAI_API_KEY;
   if (!openaiKey) {
     return res.status(500).json({ error: "OPENAI_API_KEY missing" });
   }
   const { kind, range_start, range_end, entries } = req.body || {};
   if (!Array.isArray(entries) || entries.length < 3) {
     return res.status(200).json(emptyReflection);
   }
   const openai = new OpenAI({
     apiKey: openaiKey,
   });
   const completion = await openai.chat.completions.create({
     model: "gpt-4o-mini",
     temperature: 0.35,
     response_format: {
       type: "json_schema",
       json_schema: schema,
     },
     messages: [
       {
         role: "system",
         content: `
You are The Nest reflection AI.
Only use the provided entries.
Never invent facts.
Never use outside knowledge.
Never diagnose.
Never give medical advice.
Never exaggerate.
Never flatter.
Analyze only the provided date range.
Your job:
For every day of the week, return one emotional_journey item.
If there are no entries for that day, return:
has_entry:false
emoji:""
mood:""
note:""
chart_score:null
Never invent a mood for an empty day.
- summarize what shaped the week/month
- find real highlights
- find real challenges
- describe emotional movement
- detect what changed
- choose memorable exact quotes
- create gentle suggestions based only on the entries
- create one small realistic step for the next week/month
Important:
This is not therapy.
This is not generic self-help.
This should feel like the user's own life became easier to understand.
Use the same language as the user's entries when possible.
If entries are mixed, use the language that appears most.
Every quote must be an exact short quote from an entry.
Suggestions must be specific and based on patterns in the entries.
Avoid generic advice like "drink water" or "sleep more" unless entries directly support it.
Return valid JSON only.
         `,
       },
       {
         role: "user",
         content: JSON.stringify({
           task:
             kind === "weekly"
               ? "Create a weekly reflection from exactly this week."
               : "Create a monthly reflection from the provided entries.",
           range_start,
           range_end,
           entries,
         }),
       },
     ],
   });
   const raw = completion.choices[0]?.message?.content || "{}";
   const parsed = JSON.parse(raw);
   return res.status(200).json({
     ...emptyReflection,
     ...parsed,
   });
 } catch (error: any) {
   console.error("REFLECTION V2 ERROR:", error);
   return res.status(500).json({
     error: error.message || "Could not generate reflection.",
   });
 }
}