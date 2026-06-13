import { supabase } from "@/lib/supabase";

export interface SupabaseMemo {
  id: string;
  title: string | null;
  audio_url: string;
  mime_type: string;
  duration: number;
  created_at: string;
  transcript_text?: string | null;
}

export async function loadMemos() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveMemo(blob: Blob, duration: number, mimeType: string, title?: string) {  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const ext =
    mimeType.includes("mp4") || mimeType.includes("aac")
      ? "m4a"
      : mimeType.includes("ogg")
      ? "ogg"
      : "webm";

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const upload = await supabase.storage
    .from("memos")
    .upload(path, blob, {
      contentType: mimeType,
    });

  if (upload.error) throw upload.error;

  const { data: signed, error: signedError } = await supabase.storage
  .from("memos")
  .createSignedUrl(path, 60 * 60 * 24 * 7) // 24h gültig

if (signedError) throw signedError;

const audioUrl = signed.signedUrl;

const { data, error } = await supabase
  .from("memos")
  .insert({
    user_id: user.id,
    title: title || "Voice capsule",
    audio_url: audioUrl,
    mime_type: mimeType,
    duration,
  })
  .select()
  .single();
  if (error) throw error;
  return data;
}

export async function deleteMemoFromSupabase(id: string) {
  const { error } = await supabase
    .from("memos")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
export async function transcribeMemo(memoId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please log in first.");
  }

  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ memoId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not transcribe memo.");
  }

  return data;
}