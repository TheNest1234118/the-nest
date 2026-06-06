import { supabase } from "@/lib/supabase";

export async function searchNest(query: string) {
  const q = query.trim();
  if (!q) return { thoughts: [], memos: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { thoughts: [], memos: [] };

  const [thoughts, memos] = await Promise.all([
    supabase
      .from("thoughts")
      .select("*")
      .eq("user_id", user.id)
      .ilike("text", `%${q}%`)
      .order("created_at", { ascending: false }),

    supabase
      .from("memos")
      .select("*")
      .eq("user_id", user.id)
      .or(`title.ilike.%${q}%,name.ilike.%${q}%`)
      .order("created_at", { ascending: false }),
  ]);

  return {
    thoughts: thoughts.data ?? [],
    memos: memos.data ?? [],
  };
}