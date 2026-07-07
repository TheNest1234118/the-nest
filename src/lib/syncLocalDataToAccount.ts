// src/lib/syncLocalDataToAccount.ts
import { supabase } from "@/lib/supabase";

const SYNC_DONE_KEY = "nest_local_data_synced_to_account";

export async function syncLocalDataToAccount() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const syncKey = `${SYNC_DONE_KEY}_${user.id}`;
  if (localStorage.getItem(syncKey) === "true") return;

  // THOUGHTS
  const localThoughts = JSON.parse(localStorage.getItem("nest_thoughts") || "[]");

  if (localThoughts.length > 0) {
    await supabase.from("thoughts").insert(
      localThoughts.map((thought: any) => ({
        user_id: user.id,
        content: thought.content,
        mood: thought.mood ?? null,
        created_at: thought.created_at ?? new Date().toISOString(),
      }))
    );
  }

  // MEMOS metadata only
  const localMemos = JSON.parse(localStorage.getItem("nest_memos") || "[]");

  if (localMemos.length > 0) {
    await supabase.from("memos").insert(
      localMemos.map((memo: any) => ({
        user_id: user.id,
        title: memo.title || "Voice capsule",
        duration: memo.duration ?? 0,
        transcript_text: memo.transcript_text ?? null,
        created_at: memo.created_at ?? new Date().toISOString(),
        status: memo.status ?? "local",
      }))
    );
  }

  localStorage.setItem(syncKey, "true");
}