import { supabase } from "@/lib/supabase";

export interface SupabaseMemo {
  id: string;
  audio_url: string;
  mime_type: string;
  duration: number;
  created_at: string;
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

export async function saveMemo(blob: Blob, duration: number, mimeType: string) {
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

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const upload = await supabase.storage
    .from("memos")
    .upload(path, blob, {
      contentType: mimeType,
    });

  if (upload.error) throw upload.error;

  const { data: publicData } = supabase.storage
    .from("memos")
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from("memos")
    .insert({
      user_id: user.id,
      audio_url: publicData.publicUrl,
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