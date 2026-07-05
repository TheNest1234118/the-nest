import Clarity from "@microsoft/clarity";
import { supabase } from "@/lib/supabase";

export async function initClarity() {
  const id = import.meta.env.VITE_CLARITY_ID;

  if (!id) return;
  if (typeof window === "undefined") return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Dein eigener Account -> Clarity nicht starten
  if (user?.id === "11171e8b-21a7-4258-b7f2-0a97e7d32e4d") {
    console.log("Clarity disabled for owner");
    return;
  }

  Clarity.init(id);
}