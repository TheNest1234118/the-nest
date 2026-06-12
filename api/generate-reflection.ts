import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

type ReflectionType = "weekly" | "monthly";

function getPeriod(type: ReflectionType) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (type === "weekly") start.setDate(now.getDate() - 7);
  else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
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
    if (!token) return res.status(401).json({ ok: false, error: "Missing login token" });

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

    const period = getPeriod(type);

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

    const { data: existing } = await supabase
      .from("reflections")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", type)
      .eq("period_start", period.startDate)
      .eq("period_end", period.endDate)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ ok: true, reflection: existing, cached: true });
    }

    const { data: thoughts, error: thoughtsError } = await supabase
      .from("thoughts")
      .select("text, created_at")
      .eq("user_id", user.id)
      .gte("created_at", period.startIso)
      .lte("created_at", period.endIso)
      .order("created_at", { ascending: true });

    if (thoughtsError) throw thoughtsError;

    const entries = (thoughts ?? []).map(
      (t) => `[thought | ${t.created_at}]\n${t.text}`
    );

    if (entries.length < 2) {
      return res.status(400).json({
        ok: false,
        error:
          "record a few thoughts first. your reflection will appear here when there is enough to look back on.",
      });
    }

    const prompt = `
You are a calm reflection assistant for a private mental clarity app called The Nest.
Summarize the user's own written thoughts in a warm, clear and non-judgmental way.
Do not diagnose. Do not give medical advice. Do not act like a therapist.
Make the user feel understood, not analyzed.
Never say what the user must do.
Avoid pressure, shame, streak language or productivity language.

If the text suggests acute self-harm, immediate danger, or crisis, return only:
{
  "summary": "this sounds really heavy. the nest is not emergency support. please consider reaching out to someone you trust or local emergency support.",
  "themes": [],
  "worries": [],
  "positive_moments": [],
  "cared_about": [],
  "open_thoughts": [],
  "closing_sentence": ""
}

Create a ${type} reflection.

Return only valid JSON:
{
  "summary": "short warm summary",
  "themes": ["theme"],
  "worries": ["worry"],
  "positive_moments": ["positive moment"],
  "cared_about": ["thing the user seemed to care about"],
  "open_thoughts": ["possible open thought"],
  "closing_sentence": "one gentle closing sentence"
}

Text:
${entries.join("\n\n---\n\n")}
`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const parsed = parseGeminiJson(result.response.text());

    const { data: reflection, error: insertError } = await supabase
      .from("reflections")
      .insert({
        user_id: user.id,
        type,
        period_start: period.startDate,
        period_end: period.endDate,
        summary: parsed.summary,
        themes: parsed.themes ?? [],
        worries: parsed.worries ?? [],
        positive_moments: parsed.positive_moments ?? [],
        cared_about: parsed.cared_about ?? [],
        open_thoughts: parsed.open_thoughts ?? [],
        closing_sentence: parsed.closing_sentence,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(200).json({ ok: true, reflection, cached: false });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: String(error?.message || error),
    });
  }
}