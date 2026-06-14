import { supabase } from "@/lib/supabase";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function loadThoughts() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("thoughts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}
export async function deleteThought(id: string) {
  const { error } = await supabase
    .from("thoughts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
export async function saveThought(text: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("thoughts")
    .insert({ user_id: user.id, text })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function loadAnchors() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("anchors")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function saveAnchor(type: "text" | "image", content: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("anchors")
    .insert({ user_id: user.id, type, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadMemo(file: Blob, duration: number, mimeType: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const path = `${user.id}/${crypto.randomUUID()}.webm`;

  const upload = await supabase.storage
    .from("memos")
    .upload(path, file, { contentType: mimeType });

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

export async function loadMemos() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("memos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function uploadAtmosphereTrack(file: File) {
  const user = await getCurrentUser();
  if (!user) return null;

  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from("atmosphere")
    .upload(path, file, { contentType: file.type });

  if (upload.error) throw upload.error;

  const { data: publicData } = supabase.storage
    .from("atmosphere")
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from("atmosphere_tracks")
    .insert({
      user_id: user.id,
      name: file.name,
      file_url: publicData.publicUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function loadAtmosphereTracks() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("atmosphere_tracks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}