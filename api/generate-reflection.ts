import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
type ReflectionType = "weekly" | "monthly";
const QUIET_NOT_ENOUGH_MESSAGE =
 "Add a few more thoughts or voice notes first. Your reflection will be more meaningful when there is more to look back on.";
function getPeriod(type: ReflectionType) {
 const now = new Date();
 const end = new Date(now);
 const start = new Date(now);
 if (type === "weekly") start.setDate(now.getDate() - 7);
 else start.setDate(now.getDate() - 30);
 return {
   startIso: start.toISOString(),
   endIso: end.toISOString(),
   startDate: start.toISOString().slice(0, 10),
   endDate: end.toISOString().slice(0, 10),
 };
}
function parseGeminiJson(text: string) {
 return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
}
function getLimitDays(type: ReflectionType) {
 return type === "weekly" ? 7 : 30;
}
function getMinimums(type: ReflectionType) {
 return type === "weekly"
   ? { thoughts: 3, memos: 2 }
   : { thoughts: 8, memos: 4 };
}
function getLockPayload(type: ReflectionType, lastCreatedAt: string) {
 const limitDays = getLimitDays(type);
 const last = new Date(lastCreatedAt);
 const next = new Date(last);
 next.setDate(last.getDate() + limitDays);
 const now = new Date();
 const msRemaining = next.getTime() - now.getTime();
 const daysRemaining = Math.max(1, Math.ceil(msRemaining / 86400000));
 return {
   ok: false,
   error: `Your next ${type} reflection will be available in ${daysRemaining} days.`,
   nextAvailableAt: next.toISOString(),
   daysRemaining,
 };
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
 try {
   if (req.method !== "POST") {
     return res.status(405).json({ ok: false, error: "Method not allowed" });
   }
   const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     {
       auth: {
         persistSession: false,
         autoRefreshToken: false,
       },
       realtime: {
         transport: ws as any,
       },
     }
   );
   const token = req.headers.authorization?.replace("Bearer ", "");
   if (!token) {
     return res.status(401).json({ ok: false, error: "Missing login token" });
   }
   const {
     data: { user },
     error: userError,
   } = await supabase.auth.getUser(token);
   if (userError || !user) {
     return res.status(401).json({ ok: false, error: "Invalid login" });
   }
   const type = req.body?.type as ReflectionType;
   if (type !== "weekly" && type !== "monthly") {
     return res.status(400).json({ ok: false, error: "Invalid reflection type" });
   }
   const { data: settings } = await supabase
     .from("user_settings")
     .select("allow_ai_reflections")
     .eq("user_id", user.id)
     .maybeSingle();
   if (!settings?.allow_ai_reflections) {
     return res.status(403).json({
       ok: false,
       error: "Please allow AI reflections first.",
     });
   }
   const { data: lastReflection, error: lastReflectionError } = await supabase
     .from("reflections")
     .select("created_at")
     .eq("user_id", user.id)
     .eq("type", type)
     .order("created_at", { ascending: false })
     .limit(1)
     .maybeSingle();
   if (lastReflectionError) throw lastReflectionError;
   if (lastReflection?.created_at) {
     const lastCreatedAt = new Date(lastReflection.created_at);
     const nextAvailableAt = new Date(lastCreatedAt);
     nextAvailableAt.setDate(lastCreatedAt.getDate() + getLimitDays(type));
     if (new Date() < nextAvailableAt) {
       return res.status(429).json(getLockPayload(type, lastReflection.created_at));
     }
   }
   const period = getPeriod(type);
   const minimums = getMinimums(type);
   const { data: thoughts, error: thoughtsError } = await supabase
     .from("thoughts")
     .select("text, created_at")
     .eq("user_id", user.id)
     .gte("created_at", period.startIso)
     .lte("created_at", period.endIso)
     .order("created_at", { ascending: true });
   if (thoughtsError) throw thoughtsError;
   const { data: anchors, error: anchorsError } = await supabase
 .from("anchors")
 .select("type, content, created_at")
 .eq("user_id", user.id)
 .gte("created_at", period.startIso)
 .lte("created_at", period.endIso)
 .order("created_at", { ascending: true });
if (anchorsError) throw anchorsError;
   const { data: memos, error: memosError } = await supabase
     .from("memos")
     .select("title, transcript_text, created_at")
     .eq("user_id", user.id)
     .gte("created_at", period.startIso)
     .lte("created_at", period.endIso)
     .not("transcript_text", "is", null)
     .order("created_at", { ascending: true });
   if (memosError) throw memosError;
   const thoughtCount = thoughts?.length ?? 0;
   const anchorCount = anchors?.length ?? 0;
   const memoCount = memos?.length ?? 0;
   const hasEnoughContent =
   thoughtCount >= minimums.thoughts ||
   memoCount >= minimums.memos ||
   anchorCount >= 3 ||
   thoughtCount + memoCount + anchorCount >= 5;
   if (!hasEnoughContent) {
     return res.status(400).json({
       ok: false,
       error: QUIET_NOT_ENOUGH_MESSAGE,
     });
   }
   const entries = [
    ...(thoughts ?? []).map(
      (t) => `[thought | ${t.created_at}]\n${t.text}`
    ),
    ...(memos ?? []).map(
      (m) =>
        `[voice memo transcript | ${m.created_at} | ${
          m.title || "Voice capsule"
        }]\n${m.transcript_text}`
    ),
    ...(anchors ?? []).map(
      (a) =>
        `[anchor | ${a.created_at} | ${a.type}]\n${a.content}`
    ),
   ];
  
  const weeklyJson = `
  
  {
  
    "summary": "4-7 warm sentences describing the overall feeling of the week",
  
    "themes": ["theme"],
  
    "cared_about": ["things that seemed important"],
  
    "positive_moments": ["small meaningful moments"],
  
    "open_thoughts": ["gentle unanswered questions"],
  
    "closing_sentence": "a calm closing sentence"
  
  }
  
  `;
  
  const monthlyJson = `
  
  {
  
    "summary": "6-10 warm sentences describing the month as a whole",
  
    "themes": ["theme"],
  
    "what_stayed": ["things that consistently mattered"],
  
    "what_changed": ["shifts, developments or new directions"],
  
    "moments_worth_keeping": ["meaningful moments"],
  
    "open_thoughts": ["gentle questions that remain open"],
  
    "closing_sentence": "a reflective closing sentence"
  
  }
  
  `;
  
  const prompt = `
  
  You are creating a ${type} reflection for a private app called The Nest.
  
  The Nest is not therapy.
  
  The Nest is not productivity coaching.
  
  The Nest is not self-improvement.
  
  Your role is simply to help someone gently look back at their own thoughts.
  
  IMPORTANT:
  
  - Never diagnose.
  
  - Never give advice.
  
  - Never tell the user what they should do.
  
  - Never create goals, tasks, action plans or productivity tips.
  
  - Never sound like a therapist.
  
  - Never sound like a life coach.
  
  - Never exaggerate emotions.
  
  - Never invent information that is not present in the user's thoughts.
  
  - Write with warmth, simplicity and emotional intelligence.
  
  - The user should feel understood, not analyzed.
  
  The reflection should feel like:
  
  "Oh. That really was what was on my mind."
  
  instead of:
  
  "Here is an AI analysis of your behavior."
  
  ${
  
    type === "weekly"
  
      ? `
  
  WEEKLY REFLECTION
  
  Focus on:
  
  - What appeared repeatedly this week
  
  - What seemed important
  
  - What received attention
  
  - Small positive moments
  
  - Questions that still remain open
  
  Return this exact JSON shape:
  
  ${weeklyJson}
  
  `
  
      : `
  
  MONTHLY REFLECTION
  
  The monthly reflection should feel deeper and more meaningful than the weekly reflection.
  
  Focus on:
  
  - The overall story of the month
  
  - Patterns that appeared repeatedly
  
  - What changed throughout the month
  
  - What remained important
  
  - Moments worth remembering
  
  - Gentle observations about growth or shifts in perspective
  
  Return this exact JSON shape:
  
  ${monthlyJson}
  
  `
  
  }
  
  OPEN THOUGHTS RULE
  
  Open thoughts are not advice.
  
  Bad:
  
  - You should spend more time resting.
  
  - You need to focus on yourself.
  
  Good:
  
  - What does feeling settled mean to you right now?
  
  - Which parts of this month felt most like yourself?
  
  - What keeps returning to your attention?
  
  TONE:
  
  Quiet.
  
  Warm.
  
  Gentle.
  
  Human.
  
  The reflection should feel like a letter from the future version of your own thoughts.
  
  Return valid JSON only.
  
  TEXT:
  
  ${entries.join("\n\n---\n\n")}
  
  `;
  
  const openai = new OpenAI({
  
    apiKey: process.env.OPENAI_API_KEY!,
  
  });
  
  const completion = await openai.chat.completions.create({
  
    model: "gpt-4o-mini",
  
    messages: [
  
      {
  
        role: "system",
  
        content: prompt,
  
      },
  
    ],
  
    response_format: { type: "json_object" },
  
  });
  
  const parsed = JSON.parse(
  
    completion.choices[0]?.message?.content || "{}"
  
  );
  
  const { data: reflection, error: insertError } = await supabase
  
    .from("reflections")
  
    .insert({
  
      user_id: user.id,
  
      type,
  
      period_start: period.startDate,
  
      period_end: period.endDate,
  
      summary: parsed.summary ?? "",
  
      themes: parsed.themes ?? [],
  
      worries: parsed.worries ?? [],
  
      positive_moments:
  
        parsed.positive_moments ??
  
        parsed.moments_worth_keeping ??
  
        [],
  
      cared_about:
  
        parsed.cared_about ??
  
        parsed.what_stayed ??
  
        [],
  
      open_thoughts: parsed.open_thoughts ?? [],
  
      closing_sentence: parsed.closing_sentence ?? "",
  
    })
  
    .select()
  
    .single();
  
    if (insertError) throw insertError;
    return res.status(200).json({
      ok: true,
      reflection,
      cached: false,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: String(error?.message || error),
    });
  }
 }