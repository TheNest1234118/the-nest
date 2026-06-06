import { supabase } from "@/lib/supabase";

export async function loadTags() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createTag(name: string) {
  const cleanName = name.trim().toLowerCase();
  if (!cleanName) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("tags")
    .upsert(
      {
        user_id: user.id,
        name: cleanName,
      },
      {
        onConflict: "user_id,name",
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function attachTagToEntry(
  tagName: string,
  entryType: "thought" | "memo" | "anchor" | "reset" | "ritual",
  entryId: string
) {
  const tag = await createTag(tagName);
  if (!tag) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("entry_tags")
    .insert({
      user_id: user.id,
      tag_id: tag.id,
      entry_type: entryType,
      entry_id: entryId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}