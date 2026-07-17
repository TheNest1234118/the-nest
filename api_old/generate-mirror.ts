import type {
    VercelRequest,
    VercelResponse,
  } from "@vercel/node";
  
  import OpenAI from "openai";
  
  export const config = {
    maxDuration: 120,
  };
  
  export type MirrorInputEntry = {
    id: string;
    title: string;
    transcript: string;
    created_at: string;
  };
  
  export type PreviousMirrorSummary = {
    title?: string;
    reflection?: string;
    past_entry_id?: string;
    recent_entry_id?: string;
  };
  
  export type GenerateMirrorInput = {
    recentEntries: MirrorInputEntry[];
    pastEntries: MirrorInputEntry[];
    previousMirrors?: PreviousMirrorSummary[];
  };
  
  export type GeneratedMirrorResult = {
    found: boolean;
    reason: string;
  
    title: string;
    past: string;
    present: string;
    reflection: string;
  
    past_entry_id: string;
    recent_entry_id: string;
  
    past_date: string;
    recent_date: string;
  
    confidence_score: number;
  
    category:
      | "confidence"
      | "future"
      | "work"
      | "relationships"
      | "family"
      | "identity"
      | "motivation"
      | "stress"
      | "growth"
      | "priorities"
      | "other";
  };
  
  const responseSchema = {
    name: "mirror_comparison",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "found",
        "reason",
        "title",
        "past",
        "present",
        "reflection",
        "past_entry_id",
        "recent_entry_id",
        "past_date",
        "recent_date",
        "confidence_score",
        "category",
      ],
      properties: {
        found: {
          type: "boolean",
        },
        reason: {
          type: "string",
        },
        title: {
          type: "string",
        },
        past: {
          type: "string",
        },
        present: {
          type: "string",
        },
        reflection: {
          type: "string",
        },
        past_entry_id: {
          type: "string",
        },
        recent_entry_id: {
          type: "string",
        },
        past_date: {
          type: "string",
        },
        recent_date: {
          type: "string",
        },
        confidence_score: {
          type: "integer",
          minimum: 0,
          maximum: 100,
        },
        category: {
          type: "string",
          enum: [
            "confidence",
            "future",
            "work",
            "relationships",
            "family",
            "identity",
            "motivation",
            "stress",
            "growth",
            "priorities",
            "other",
          ],
        },
      },
    },
  };
  
  const SYSTEM_PROMPT = `
  You are The Nest Mirror.
  
  The Nest is not a therapist.
  The Nest is not a life coach.
  The Nest is a calm observer.
  
  Compare RECENT voice recordings with OLDER voice recordings.
  Your goal is not to summarize. Your goal is to reveal one meaningful change.
  
  Find one grounded contrast involving:
  - confidence
  - priorities
  - recurring people
  - work
  - family
  - relationships
  - future plans
  - motivation
  - stress
  - identity
  - language or outlook
  
  Rules:
  - Use only the supplied transcripts.
  - Never invent events or quotes.
  - Never diagnose.
  - Never create drama.
  - Never manipulate emotion.
  - Never claim a change unless the supplied entries support it.
  - The past and present entries must be at least 30 days apart.
  - Prefer exact short quotes copied from the transcripts.
  - Do not repeat previous Mirror results.
  - Return only one comparison.
  - Return found=false when there is no strong, useful contrast.
  - Confidence below 70 should return found=false.
  - Use the language used by the majority of the entries.
  
  When found=true:
  - title: short, human and intriguing.
  - past: one short exact quote or faithful concise statement from the older entry.
  - present: one short exact quote or faithful concise statement from the recent entry.
  - reflection: one calm sentence explaining the change.
  - past_entry_id and recent_entry_id must exactly match supplied IDs.
  - dates must exactly match the selected supplied entry dates.
  - Maximum total visible text: 120 words.
  
  Return valid JSON only.
  `;
  
  function cleanEntries(value: unknown): MirrorInputEntry[] {
    if (!Array.isArray(value)) return [];
  
    return value
      .filter((item) => item && typeof item === "object")
      .map((item: any) => ({
        id: String(item.id || ""),
        title: String(item.title || "Voice Capsule"),
        transcript: String(item.transcript || "").trim(),
        created_at: String(item.created_at || ""),
      }))
      .filter(
        (item) =>
          item.id &&
          item.created_at &&
          item.transcript.length >= 20
      )
      .slice(0, 50);
  }
  
  function cleanPrevious(value: unknown): PreviousMirrorSummary[] {
    if (!Array.isArray(value)) return [];
  
    return value
      .filter((item) => item && typeof item === "object")
      .map((item: any) => ({
        title: String(item.title || ""),
        reflection: String(item.reflection || ""),
        past_entry_id: String(item.past_entry_id || ""),
        recent_entry_id: String(item.recent_entry_id || ""),
      }))
      .slice(0, 30);
  }
  
  function emptyResult(reason: string): GeneratedMirrorResult {
    return {
      found: false,
      reason,
      title: "",
      past: "",
      present: "",
      reflection: "",
      past_entry_id: "",
      recent_entry_id: "",
      past_date: "",
      recent_date: "",
      confidence_score: 0,
      category: "other",
    };
  }
  
  function normalizeResult(
    value: any,
    recentEntries: MirrorInputEntry[],
    pastEntries: MirrorInputEntry[]
  ): GeneratedMirrorResult {
    const recent = recentEntries.find(
      (entry) => entry.id === String(value?.recent_entry_id || "")
    );
  
    const past = pastEntries.find(
      (entry) => entry.id === String(value?.past_entry_id || "")
    );
  
    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(value?.confidence_score || 0)))
    );
  
    if (
      value?.found !== true ||
      !recent ||
      !past ||
      score < 70
    ) {
      return emptyResult(
        String(value?.reason || "No sufficiently strong change was found.")
      );
    }
  
    const separationDays =
      Math.abs(
        new Date(recent.created_at).getTime() -
          new Date(past.created_at).getTime()
      ) /
      (24 * 60 * 60 * 1000);
  
    if (separationDays < 30) {
      return emptyResult(
        "The selected entries were not far enough apart."
      );
    }
  
    return {
      found: true,
      reason: String(value?.reason || ""),
      title: String(value?.title || "").trim().slice(0, 140),
      past: String(value?.past || "").trim().slice(0, 500),
      present: String(value?.present || "").trim().slice(0, 500),
      reflection: String(value?.reflection || "").trim().slice(0, 700),
  
      past_entry_id: past.id,
      recent_entry_id: recent.id,
  
      past_date: past.created_at,
      recent_date: recent.created_at,
  
      confidence_score: score,
  
      category: [
        "confidence",
        "future",
        "work",
        "relationships",
        "family",
        "identity",
        "motivation",
        "stress",
        "growth",
        "priorities",
        "other",
      ].includes(String(value?.category))
        ? value.category
        : "other",
    };
  }
  
  export async function generateMirrorComparison({
    recentEntries,
    pastEntries,
    previousMirrors = [],
  }: GenerateMirrorInput): Promise<GeneratedMirrorResult> {
    const apiKey = process.env.OPENAI_API_KEY;
  
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY missing");
    }
  
    const cleanRecent = cleanEntries(recentEntries);
    const cleanPast = cleanEntries(pastEntries);
    const cleanPreviousMirrors = cleanPrevious(previousMirrors);
  
    if (cleanRecent.length === 0 || cleanPast.length === 0) {
      return emptyResult(
        "Mirror needs both a recent and an older Voice Capsule."
      );
    }
  
    const openai = new OpenAI({
      apiKey,
    });
  
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.15,
      response_format: {
        type: "json_schema",
        json_schema: responseSchema,
      },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Find exactly one meaningful contrast between the recent and older recordings.",
  
            recent_entries: cleanRecent,
            older_entries: cleanPast,
  
            previous_mirrors:
              cleanPreviousMirrors,
  
            constraints: {
              minimum_days_apart: 30,
              minimum_confidence: 70,
              return_zero_when_uncertain: true,
            },
          }),
        },
      ],
    });
  
    const raw =
      completion.choices[0]?.message?.content || "{}";
  
    let parsed: any;
  
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("OpenAI returned invalid Mirror JSON.");
    }
  
    return normalizeResult(
      parsed,
      cleanRecent,
      cleanPast
    );
  }
  
  function isAuthorized(req: VercelRequest) {
    const expected =
      process.env.MIRROR_INTERNAL_SECRET ||
      process.env.CRON_SECRET;
  
    if (!expected) return false;
  
    const authorization =
      typeof req.headers.authorization === "string"
        ? req.headers.authorization
        : "";
  
    const internalSecret =
      typeof req.headers["x-internal-secret"] === "string"
        ? req.headers["x-internal-secret"]
        : "";
  
    return (
      authorization === `Bearer ${expected}` ||
      internalSecret === expected
    );
  }
  
  export default async function handler(
    req: VercelRequest,
    res: VercelResponse
  ) {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }
  
    if (!isAuthorized(req)) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }
  
    try {
      const result = await generateMirrorComparison({
        recentEntries: req.body?.recentEntries || [],
        pastEntries: req.body?.pastEntries || [],
        previousMirrors: req.body?.previousMirrors || [],
      });
  
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("GENERATE MIRROR ERROR:", error);
  
      return res.status(500).json({
        error:
          error.message ||
          "Could not generate Mirror comparison.",
      });
    }
  }
  