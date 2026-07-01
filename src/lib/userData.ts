import { supabase } from "@/lib/supabase";
import { embedMemoryFromClient } from "@/lib/askPast";
import { encryptText, decryptText } from "@/lib/crypto";
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
export async function loadThoughts() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("thoughts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return Promise.all(
    (data || []).map(async (thought: any) => {
      try {
        return {
          ...thought,
          text: thought.text_encrypted
            ? await decryptText(thought.text_encrypted)
            : thought.text,
        };
      } catch (err) {
        console.error("Could not decrypt thought:", thought.id, err);

        return {
          ...thought,
          text:
            thought.text && thought.text !== "[encrypted]"
              ? thought.text
              : "Could not decrypt this thought.",
        };
      }
    })
  );
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

  const encrypted = await encryptText(text);

  const { data, error } = await supabase
    .from("thoughts")
    .insert({
      user_id: user.id,
      text: "[encrypted]",
      text_encrypted: encrypted,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    text,
  };
}
export async function loadAnchors() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("anchors")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return Promise.all(
    (data || []).map(async (anchor: any) => ({
      ...anchor,
      content:
        anchor.type === "text" && anchor.content_encrypted
          ? await decryptText(anchor.content_encrypted)
          : anchor.content,
    }))
  );
}
export async function saveAnchor(type: "text" | "image", content: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const encrypted =
    type === "text" ? await encryptText(content) : null;

  const { data, error } = await supabase
    .from("anchors")
    .insert({
      user_id: user.id,
      type,
      content: type === "text" ? "[encrypted]" : content,
      content_encrypted: encrypted,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    content,
  };
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