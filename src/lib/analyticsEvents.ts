import Clarity from "@microsoft/clarity";
import { trackEvent } from "@/lib/analytics";

export function trackNestEvent(name: string, data?: Record<string, any>) {
  try {
    Clarity.event(name);
  } catch {}

  try {
    trackEvent(name, "The Nest", data ? JSON.stringify(data) : undefined);
  } catch {}
}

export const events = {
  landing_view: "landing_view",
  landing_enter_clicked: "landing_enter_clicked",

  onboarding_step: "onboarding_step",
  completed_onboarding: "completed_onboarding",

  started_recording: "started_recording",
  finished_recording: "finished_recording",
  changed_voice_prompt: "changed_voice_prompt",
  deleted_recording: "deleted_recording",

  opened_ask_past: "opened_ask_past",
  asked_past_question: "asked_past_question",
  clicked_ask_past_example: "clicked_ask_past_example",
  opened_sources: "opened_sources",

  opened_insights: "opened_insights",
  opened_ai_patterns: "opened_ai_patterns",
  opened_weekly_reflection: "opened_weekly_reflection",

  opened_signup: "opened_signup",
  created_account: "created_account",
};