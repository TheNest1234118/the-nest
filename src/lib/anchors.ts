import { supabase } from "@/lib/supabase";

export async function loadAnchors() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("anchors")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveTextAnchor(text: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("anchors")
    .insert({
      user_id: user.id,
      type: "text",
      content: text,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveImageAnchor(file: File) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  const upload = await supabase.storage
    .from("anchors")
    .upload(path, file, { contentType: file.type });

  if (upload.error) throw upload.error;

  const { data: publicData } = supabase.storage
    .from("anchors")
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from("anchors")
    .insert({
      user_id: user.id,
      type: "image",
      content: publicData.publicUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}