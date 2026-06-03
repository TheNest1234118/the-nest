import { supabase } from "@/lib/supabase";

export async function loadAtmosphereTracks() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("atmosphere_tracks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function uploadAtmosphereTrack(file: File) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  const upload = await supabase.storage
    .from("atmosphere")
    .upload(path, file, {
      contentType: file.type,
    });

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