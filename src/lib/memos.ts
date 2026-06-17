import { supabase } from "@/lib/supabase";

export interface SupabaseMemo {
  id: string;
  title: string | null;
  audio_url?: string | null;
  storage_path: string;
  mime_type: string;
  duration: number;
  created_at: string;
  transcript_text?: string | null;
  status: "processing" | "ready" | "failed";
  transcript_error?: string | null;
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

  if (!user) return [];

  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveMemo(
  blob: Blob,
  duration: number,
  mimeType: string,
  title?: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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
      status: "processing",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteMemoFromSupabase(id: string) {
  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw error;
}