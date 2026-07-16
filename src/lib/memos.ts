import {
  supabase,
} from "@/lib/supabase";

const LOCAL_MEMOS_KEY =
  "nest_local_memos";

export type MemoStatus =
  | "processing"
  | "ready"
  | "failed"
  | "local";

export interface SupabaseMemo {
  id: string;

  title: string | null;

  user_id?: string | null;

  audio_url?: string | null;

  storage_path: string | null;

  mime_type: string;

  duration: number;

  created_at: string;

  transcript_text?: string | null;

  status: MemoStatus;

  transcript_error?: string | null;

  processing_started_at?: string | null;

  processing_finished_at?: string | null;
}

export type RetryTranscriptionResult = {
  ok: boolean;

  memoId?: string;

  error?: string;

  result?: {
    ok?: boolean;

    memoId?: string;

    transcriptLength?: number;

    award?: {
      evaluated: boolean;
      qualified: boolean;
      countedToday: boolean;
      reason: string | null;
      qualityScore: number | null;
    } | null;
  };

  transcribeStatus?: number;

  transcribeResponse?: unknown;
};

function isBrowser() {
  return (
    typeof window !== "undefined" &&
    typeof localStorage !==
      "undefined"
  );
}

function normalizeMemo(
  value: any
): SupabaseMemo {
  return {
    id: String(value.id),

    title:
      value.title === null ||
      value.title === undefined
        ? null
        : String(value.title),

    user_id:
      value.user_id || null,

    audio_url:
      value.audio_url || null,

    storage_path:
      value.storage_path || null,

    mime_type:
      String(
        value.mime_type ||
          "audio/webm"
      ),

    duration: Math.max(
      0,
      Number(value.duration || 0)
    ),

    created_at:
      String(
        value.created_at ||
          new Date().toISOString()
      ),

    transcript_text:
      value.transcript_text ||
      null,

    status:
      value.status ===
        "processing" ||
      value.status === "ready" ||
      value.status === "failed" ||
      value.status === "local"
        ? value.status
        : "ready",

    transcript_error:
      value.transcript_error ||
      null,

    processing_started_at:
      value.processing_started_at ||
      null,

    processing_finished_at:
      value.processing_finished_at ||
      null,
  };
}

function readLocalMemos(): SupabaseMemo[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        localStorage.getItem(
          LOCAL_MEMOS_KEY
        ) || "[]"
      );

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeMemo)
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );
  } catch (error) {
    console.error(
      "Could not read local memos:",
      error
    );

    return [];
  }
}

function writeLocalMemos(
  memos: SupabaseMemo[]
) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    LOCAL_MEMOS_KEY,
    JSON.stringify(memos)
  );
}

function updateLocalMemo(
  id: string,
  update:
    | Partial<SupabaseMemo>
    | ((
        memo: SupabaseMemo
      ) => SupabaseMemo)
) {
  const existing =
    readLocalMemos();

  const next =
    existing.map((memo) => {
      if (memo.id !== id) {
        return memo;
      }

      if (
        typeof update ===
        "function"
      ) {
        return normalizeMemo(
          update(memo)
        );
      }

      return normalizeMemo({
        ...memo,
        ...update,
      });
    });

  writeLocalMemos(next);

  return (
    next.find(
      (memo) => memo.id === id
    ) || null
  );
}

function getAudioExtension(
  mimeType: string
) {
  const normalized =
    mimeType.toLowerCase();

  if (
    normalized.includes("mp4") ||
    normalized.includes("aac") ||
    normalized.includes("m4a")
  ) {
    return "m4a";
  }

  if (
    normalized.includes("ogg")
  ) {
    return "ogg";
  }

  if (
    normalized.includes("mpeg") ||
    normalized.includes("mp3")
  ) {
    return "mp3";
  }

  if (
    normalized.includes("wav")
  ) {
    return "wav";
  }

  return "webm";
}

export async function getMemoAudioUrl(
  storagePath: string
) {
  if (!storagePath) {
    throw new Error(
      "Missing memo storage path."
    );
  }

  const {
    data,
    error,
  } = await supabase.storage
    .from("memos")
    .createSignedUrl(
      storagePath,
      60 * 60
    );

  if (error) {
    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error(
      "Could not create audio URL."
    );
  }

  return data.signedUrl;
}

export async function loadMemos(): Promise<
  SupabaseMemo[]
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const localMemos =
    readLocalMemos();

  if (!user) {
    return localMemos;
  }

  const {
    data,
    error,
  } = await supabase
    .from("memos")
    .select(
      `
        id,
        user_id,
        title,
        storage_path,
        mime_type,
        duration,
        created_at,
        transcript_text,
        status,
        transcript_error,
        processing_started_at,
        processing_finished_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  const cloudMemos =
    (data || []).map(
      normalizeMemo
    );

  return [
    ...localMemos,
    ...cloudMemos,
  ].sort(
    (a, b) =>
      new Date(
        b.created_at
      ).getTime() -
      new Date(
        a.created_at
      ).getTime()
  );
}

export async function saveMemo(
  blob: Blob,
  duration: number,
  mimeType: string,
  title?: string,
  createTranscript = true
): Promise<SupabaseMemo> {
  if (!blob || blob.size === 0) {
    throw new Error(
      "The recording is empty."
    );
  }

  const safeDuration =
    Math.max(
      0,
      Math.round(
        Number(duration || 0)
      )
    );

  const safeMimeType =
    String(
      mimeType ||
        blob.type ||
        "audio/webm"
    );

  const cleanTitle =
    String(title || "").trim();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const localMemo: SupabaseMemo =
      {
        id: `local-${crypto.randomUUID()}`,

        title:
          cleanTitle ||
          "Voice capsule",

        /*
         * Object URLs only remain valid in the current browser session.
         * Your existing local fallback behaviour is retained.
         */
        audio_url:
          URL.createObjectURL(blob),

        storage_path: null,

        mime_type:
          safeMimeType,

        duration:
          safeDuration,

        created_at:
          new Date().toISOString(),

        transcript_text: null,

        status: "local",

        transcript_error: null,

        processing_started_at:
          null,

        processing_finished_at:
          null,
      };

    const existing =
      readLocalMemos();

    writeLocalMemos([
      localMemo,
      ...existing,
    ]);

    return localMemo;
  }

  const extension =
    getAudioExtension(
      safeMimeType
    );

  const storagePath =
    `${user.id}/` +
    `${crypto.randomUUID()}.` +
    extension;

  const {
    error: uploadError,
  } = await supabase.storage
    .from("memos")
    .upload(
      storagePath,
      blob,
      {
        contentType:
          safeMimeType,

        upsert: false,

        cacheControl: "3600",
      }
    );

  if (uploadError) {
    throw uploadError;
  }

  const {
    data,
    error: insertError,
  } = await supabase
    .from("memos")
    .insert({
      user_id: user.id,

      title:
        cleanTitle ||
        "Voice capsule",

      storage_path:
        storagePath,

      mime_type:
        safeMimeType,

      duration:
        safeDuration,

      status:
        createTranscript
          ? "processing"
          : "ready",

      transcript_text:
        null,

      transcript_error:
        createTranscript
          ? null
          : "Transcription disabled by user.",

      processing_started_at:
        null,

      processing_finished_at:
        createTranscript
          ? null
          : new Date()
              .toISOString(),
    })
    .select(
      `
        id,
        user_id,
        title,
        storage_path,
        mime_type,
        duration,
        created_at,
        transcript_text,
        status,
        transcript_error,
        processing_started_at,
        processing_finished_at
      `
    )
    .single();

  if (
    insertError ||
    !data
  ) {
    /*
     * Avoid leaving an orphaned Storage file when the
     * database insert fails.
     */
    await supabase.storage
      .from("memos")
      .remove([
        storagePath,
      ]);

    throw (
      insertError ||
      new Error(
        "Could not save memo."
      )
    );
  }

  return normalizeMemo(data);
}

export async function updateMemoTitle(
  id: string,
  title: string
): Promise<SupabaseMemo | null> {
  const cleanTitle =
    title.trim();

  if (!cleanTitle) {
    throw new Error(
      "Please enter a title."
    );
  }

  if (
    id.startsWith("local-")
  ) {
    return updateLocalMemo(
      id,
      {
        title: cleanTitle,
      }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Please sign in first."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("memos")
    .update({
      title: cleanTitle,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      `
        id,
        user_id,
        title,
        storage_path,
        mime_type,
        duration,
        created_at,
        transcript_text,
        status,
        transcript_error,
        processing_started_at,
        processing_finished_at
      `
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? normalizeMemo(data)
    : null;
}

export async function deleteMemoFromSupabase(
  id: string
) {
  if (
    id.startsWith("local-")
  ) {
    const existing =
      readLocalMemos();

    const memo =
      existing.find(
        (item) =>
          item.id === id
      );

    if (
      memo?.audio_url?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        memo.audio_url
      );
    }

    writeLocalMemos(
      existing.filter(
        (memo) =>
          memo.id !== id
      )
    );

    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Please sign in first."
    );
  }

  const {
    data: memo,
    error: loadError,
  } = await supabase
    .from("memos")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  const {
    error: deleteError,
  } = await supabase
    .from("memos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    throw deleteError;
  }

  if (memo?.storage_path) {
    const {
      error: storageError,
    } = await supabase.storage
      .from("memos")
      .remove([
        memo.storage_path,
      ]);

    if (storageError) {
      console.error(
        "Memo row deleted, but audio cleanup failed:",
        storageError
      );
    }
  }
}

export async function retryMemoTranscription(
  id: string
): Promise<RetryTranscriptionResult> {
  if (
    id.startsWith("local-")
  ) {
    throw new Error(
      "Local recordings cannot be transcribed. Sign in and create a new Voice Capsule."
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (
    !session?.access_token
  ) {
    throw new Error(
      "Please sign in first."
    );
  }

  const response =
    await fetch(
      "/api/retry-transcribe",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${session.access_token}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          memoId: id,
        }),
      }
    );

  const text =
    await response.text();

  let result:
    RetryTranscriptionResult;

  try {
    result =
      JSON.parse(text);
  } catch {
    result = {
      ok: false,
      error:
        text ||
        "Could not retry transcription.",
    };
  }

  if (
    !response.ok ||
    result.ok === false
  ) {
    throw new Error(
      result.error ||
        "Could not retry transcription."
    );
  }

  return result;
}