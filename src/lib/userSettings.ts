import { supabase } from "@/lib/supabase";

export type VoiceIntensity = "off" | "minimal" | "guided";

export interface LastSession {
  key: string;
  label: string;
  completedAt: number;
}

export async function loadUserSettings() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveVoiceIntensity(voiceIntensity: VoiceIntensity) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    localStorage.setItem("nest_voice_intensity", voiceIntensity);
    return;
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      voice_intensity: voiceIntensity,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function saveLastSession(lastSession: LastSession) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  localStorage.setItem("nest_last_session", JSON.stringify(lastSession));

  if (!user) return;

  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      last_session: lastSession,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}