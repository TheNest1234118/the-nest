import { supabase } from "@/lib/supabase";
export type ReflectionType = "weekly" | "monthly";
export interface Reflection {
 id: string;
 user_id: string;
 type: ReflectionType;
 period_start: string;
 period_end: string;
 summary: string | null;
 themes: string[];
 worries: string[];
 positive_moments: string[];
 cared_about: string[];
 open_thoughts: string[];
 closing_sentence: string | null;
 created_at: string;
}
export interface ReflectionGenerateResponse {
 ok: boolean;
 reflection?: Reflection;
 error?: string;
 nextAvailableAt?: string;
 daysRemaining?: number;
}
export async function getAiReflectionOptIn() {
 const {
   data: { user },
 } = await supabase.auth.getUser();
 if (!user) return false;
 const { data, error } = await supabase
   .from("user_settings")
   .select("allow_ai_reflections")
   .eq("user_id", user.id)
   .maybeSingle();
 if (error) throw error;
 return Boolean(data?.allow_ai_reflections);
}
export async function setAiReflectionOptIn(enabled: boolean) {
 const {
   data: { user },
 } = await supabase.auth.getUser();
 if (!user) return false;
 const { error } = await supabase.from("user_settings").upsert({
   user_id: user.id,
   allow_ai_reflections: enabled,
 });
 if (error) throw error;
 return true;
}
export async function loadReflections() {
 const {
   data: { user },
 } = await supabase.auth.getUser();
 if (!user) return [];
 const { data, error } = await supabase
   .from("reflections")
   .select("*")
   .eq("user_id", user.id)
   .order("created_at", { ascending: false });
 if (error) throw error;
 return (data ?? []) as Reflection[];
}
export async function generateReflection(
 type: ReflectionType
): Promise<ReflectionGenerateResponse> {
 const {
   data: { session },
 } = await supabase.auth.getSession();
 if (!session?.access_token) {
   return { ok: false, error: "Please log in first." };
 }
 const response = await fetch("/api/generate-reflection", {
   method: "POST",
   headers: {
     Authorization: `Bearer ${session.access_token}`,
     "Content-Type": "application/json",
   },
   body: JSON.stringify({ type }),
 });
 const raw = await response.text();
 let data: ReflectionGenerateResponse;
 try {
   data = JSON.parse(raw);
 } catch {
   return {
     ok: false,
     error: raw.slice(0, 300) || "Could not generate reflection.",
   };
 }
 return data;
}