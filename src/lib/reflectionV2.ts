import { loadThoughts } from "@/lib/userData";
import { loadMemos } from "@/lib/memos";
import { supabase } from "@/lib/supabase";
import { loadMoodLog } from "@/lib/dailyNest";

import type {
  ReflectionKind,
  ReflectionV2Generation,
  ReflectionV2Result,
} from "@/lib/reflectionV2Types";

const LOCAL_STORAGE_KEY =
  "nest_reflection_v2_history";

function getCurrentWeekRange() {
  const now = new Date();

  const day = now.getDay();
  const daysSinceMonday =
    day === 0 ? 6 : day - 1;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(
    start.getDate() - daysSinceMonday
  );

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return {
    start,
    end,
  };
}

function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  start.setHours(0, 0, 0, 0);

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  end.setHours(0, 0, 0, 0);

  return {
    start,
    end,
  };
}

function getRangeForKind(
  kind: ReflectionKind
) {
  return kind === "weekly"
    ? getCurrentWeekRange()
    : getCurrentMonthRange();
}

function inRange(
  date: string | null | undefined,
  start: Date,
  end: Date
) {
  if (!date) {
    return false;
  }

  const timestamp =
    new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return (
    timestamp >= start.getTime() &&
    timestamp < end.getTime()
  );
}

function createEmptyResult(): ReflectionV2Result {
  return {
    digest_title: "",
    story: "",
    biggest_change: "",
    quote_of_the_week: "",
    integrated_insight: null,

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

    monthly_themes: [],
    month_growth: [],
  };
}

function mapGenerationRow(
  row: any
): ReflectionV2Generation {
  return {
    id: String(row.id),
    kind:
      row.kind === "monthly"
        ? "monthly"
        : "weekly",
    created_at: String(row.created_at),
    range_start:
      row.range_start || undefined,
    range_end:
      row.range_end || undefined,
    voice_count: Number(
      row.voice_count || 0
    ),
    thought_count: Number(
      row.thought_count || 0
    ),
    mood_count: Number(
      row.mood_count || 0
    ),
    result: {
      ...createEmptyResult(),
      ...(row.result || {}),
    },
  };
}

function readLocalHistory(
  kind: ReflectionKind
): ReflectionV2Generation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
      localStorage.getItem(
        LOCAL_STORAGE_KEY
      ) || "[]"
    );

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(mapGenerationRow)
      .filter(
        (item) => item.kind === kind
      )
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );
  } catch {
    return [];
  }
}

function writeLocalGeneration(
  item: ReflectionV2Generation
) {
  if (typeof window === "undefined") {
    return;
  }

  let existing: ReflectionV2Generation[] =
    [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem(
        LOCAL_STORAGE_KEY
      ) || "[]"
    );

    existing = Array.isArray(parsed)
      ? parsed.map(mapGenerationRow)
      : [];
  } catch {
    existing = [];
  }

  const withoutDuplicate =
    existing.filter(
      (generation) =>
        generation.id !== item.id
    );

  const next = [
    item,
    ...withoutDuplicate,
  ].slice(0, 40);

  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(next)
  );
}

export async function loadReflectionV2History(
  kind: ReflectionKind
): Promise<ReflectionV2Generation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return readLocalHistory(kind);
  }

  const { data, error } = await supabase
    .from("reflection_v2_generations")
    .select(
      `
        id,
        kind,
        created_at,
        range_start,
        range_end,
        voice_count,
        thought_count,
        mood_count,
        result
      `
    )
    .eq("user_id", user.id)
    .eq("kind", kind)
    .order("created_at", {
      ascending: false,
    })
    .limit(30);

  if (error) {
    console.error(
      "Could not load reflection history:",
      error
    );

    return [];
  }

  return (data || []).map(
    mapGenerationRow
  );
}

async function saveReflectionV2(
  item: ReflectionV2Generation
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    writeLocalGeneration(item);
    return;
  }

  const { error } = await supabase
    .from("reflection_v2_generations")
    .insert({
      id: item.id,
      user_id: user.id,
      kind: item.kind,
      created_at: item.created_at,
      range_start: item.range_start,
      range_end: item.range_end,
      voice_count: item.voice_count,
      thought_count:
        item.thought_count,
      mood_count: item.mood_count,
      result: item.result,
    });

  if (error) {
    throw new Error(
      error.message ||
        "Could not save The Nest Digest."
    );
  }
}

export async function generateReflectionV2(
  kind: ReflectionKind
): Promise<ReflectionV2Generation> {
  const { start, end } =
    getRangeForKind(kind);

  const [
    thoughts,
    memos,
    moods,
  ] = await Promise.all([
    loadThoughts(),
    loadMemos(),
    loadMoodLog(),
  ]);

  const rangeThoughts = (
    thoughts || []
  ).filter((thought: any) =>
    inRange(
      thought.created_at,
      start,
      end
    )
  );

  const rangeMemos = (
    memos || []
  ).filter((memo: any) =>
    inRange(
      memo.created_at,
      start,
      end
    )
  );

  const rangeMoods = (
    moods || []
  ).filter((mood: any) =>
    inRange(
      mood.mood_date ||
        mood.created_at,
      start,
      end
    )
  );

  const entries = [
    ...rangeThoughts.map(
      (thought: any) => ({
        type: "thought",
        id: String(thought.id),
        date: String(
          thought.created_at
        ),
        title: "Thought",
        text: String(
          thought.text || ""
        ),
        transcript: "",
        mood: "",
        note: "",
      })
    ),

    ...rangeMemos.map(
      (memo: any) => ({
        type: "voice",
        id: String(memo.id),
        date: String(
          memo.created_at
        ),
        title: String(
          memo.title ||
            "Voice capsule"
        ),
        text: "",
        transcript: String(
          memo.transcript_text || ""
        ),
        mood: "",
        note: "",
      })
    ),

    ...rangeMoods.map(
      (mood: any) => ({
        type: "mood",
        id: String(mood.id),
        date: String(
          mood.mood_date ||
            mood.created_at
        ),
        title: "Mood",
        text: "",
        transcript: "",
        mood: String(
          mood.mood || ""
        ),
        note: String(
          mood.note || ""
        ),
      })
    ),
  ]
    .filter((entry) => {
      const content = String(
        entry.transcript ||
          entry.text ||
          entry.note ||
          entry.mood ||
          entry.title ||
          ""
      ).trim();

      return Boolean(content);
    })
    .sort(
      (a, b) =>
        new Date(
          a.date
        ).getTime() -
        new Date(
          b.date
        ).getTime()
    );

  const generation: ReflectionV2Generation =
    {
      id: crypto.randomUUID(),
      kind,
      created_at:
        new Date().toISOString(),
      range_start:
        start.toISOString(),
      range_end:
        end.toISOString(),
      voice_count:
        rangeMemos.length,
      thought_count:
        rangeThoughts.length,
      mood_count:
        rangeMoods.length,
      result: createEmptyResult(),
    };

  /*
   * Do not call OpenAI when there is not
   * enough material for a meaningful Digest.
   */
  if (entries.length < 3) {
    return generation;
  }

  const response = await fetch(
    "/api/daily-reminder",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        kind,
        range_start:
          start.toISOString(),
        range_end:
          end.toISOString(),
        entries,
      }),
    }
  );

  const responseText =
    await response.text();

  let responseData: any = null;

  try {
    responseData = JSON.parse(
      responseText
    );
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    throw new Error(
      responseData?.error ||
        "Could not create The Nest Digest."
    );
  }

  const result: ReflectionV2Result = {
    ...createEmptyResult(),
    ...(responseData || {}),
  };

  const finalItem: ReflectionV2Generation =
    {
      ...generation,
      result,
    };

  await saveReflectionV2(finalItem);

  return finalItem;
}