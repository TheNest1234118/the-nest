import { supabase } from "@/lib/supabase";

const LOCAL_MEMOS_KEY = "nest_local_memos";

export interface SupabaseMemo {
  id: string;
  title: string | null;
  audio_url?: string | null;
  storage_path: string | null;
  mime_type: string;
  duration: number;
  created_at: string;
  transcript_text?: string | null;
  status: "processing" | "ready" | "failed" | "local";
  transcript_error?: string | null;
}

function readLocalMemos(): SupabaseMemo[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_MEMOS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalMemos(memos: SupabaseMemo[]) {
  localStorage.setItem(LOCAL_MEMOS_KEY, JSON.stringify(memos));
}

export async function getMemoAudioUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("memos")
    .createSignedUrl(storagePath, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function loadMemos() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const localMemos = readLocalMemos();

  if (!user) return localMemos;

  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return [...localMemos, ...(data ?? [])];
}

export async function saveMemo(
  blob: Blob,
  duration: number,
  mimeType: string,
  title?: string,
  createTranscript = true
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const localMemo: SupabaseMemo = {
      id: `local-${crypto.randomUUID()}`,
      title: title || "Voice capsule",
      audio_url: URL.createObjectURL(blob),
      storage_path: null,
      mime_type: mimeType,
      duration,
      created_at: new Date().toISOString(),
      transcript_text: null,
      status: "local",
      transcript_error: null,
    };

    const existing = readLocalMemos();
    writeLocalMemos([localMemo, ...existing]);

    return localMemo;
  }

  const ext =
    mimeType.includes("mp4") || mimeType.includes("aac")
      ? "m4a"
      : mimeType.includes("ogg")
      ? "ogg"
      : "webm";

  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const upload = await supabase.storage.from("memos").upload(storagePath, blob, {
    contentType: mimeType,
  });

  if (upload.error) throw upload.error;

  const { data, error } = await supabase
    .from("memos")
    .insert({
      user_id: user.id,
      title: title || "Voice capsule",
      storage_path: storagePath,
      mime_type: mimeType,
      duration,
      status: createTranscript ? "processing" : "ready",
transcript_error: createTranscript ? null : "Transcription disabled by user.",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteMemoFromSupabase(id: string) {
  if (id.startsWith("local-")) {
    const existing = readLocalMemos();
    writeLocalMemos(existing.filter((memo) => memo.id !== id));
    return;
  }

  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw error;
}