import { supabase } from "@/lib/supabase";

export type RitualStep =
  | { type: "breath"; duration: number; label: string }
  | { type: "memo"; label: string }
  | { type: "text"; text: string };

export interface Ritual {
  id: string;
  name: string;
  emoji: string;
  atmosphere: string;
  music_track_id: string | null;
  slowed: boolean;
  foggy: boolean;
  light_mood: string;
  steps: RitualStep[];
  created_at: string;
}

export async function loadRituals() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("rituals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveRitual(input: {
  name: string;
  emoji: string;
  atmosphere: string;
  music_track_id?: string | null;
  slowed: boolean;
  foggy: boolean;
  light_mood: string;
  steps: RitualStep[];
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("rituals")
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRitual(id: string) {
  const { error } = await supabase
    .from("rituals")
    .delete()
    .eq("id", id);

  if (error) throw error;
}