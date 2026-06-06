import { supabase } from "@/lib/supabase";

export async function exportNestData() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [thoughts, memos, anchors, resets, tags, entryTags] =
    await Promise.all([
      supabase.from("thoughts").select("*").eq("user_id", user.id),
      supabase.from("memos").select("*").eq("user_id", user.id),
      supabase.from("anchors").select("*").eq("user_id", user.id),
      supabase.from("reset_sessions").select("*").eq("user_id", user.id),
      supabase.from("tags").select("*").eq("user_id", user.id),
      supabase.from("entry_tags").select("*").eq("user_id", user.id),
    ]);

  const backup = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    thoughts: thoughts.data ?? [],
    memos: memos.data ?? [],
    anchors: anchors.data ?? [],
    reset_sessions: resets.data ?? [],
    tags: tags.data ?? [],
    entry_tags: entryTags.data ?? [],
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `the-nest-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}