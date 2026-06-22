import { supabase } from "@/lib/supabase";

export type Plan = "free" | "supporter";

export type Profile = {
  user_id: string;
  plan: Plan;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  transcriptions_this_month: number;
  transcription_month: string | null;
};

export async function getProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as Profile;

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      plan: "free",
      transcriptions_this_month: 0,
      transcription_month: new Date().toISOString().slice(0, 7),
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return created as Profile;
}

export async function isSupporter() {
  const profile = await getProfile();
  return profile?.plan === "supporter";
}

export async function startSupporterCheckout() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Could not start checkout.");
  }

  window.location.href = json.url;
}