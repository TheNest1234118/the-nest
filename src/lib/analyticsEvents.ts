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

  onboarding_landing: "onboarding_landing",
  onboarding_why_here: "onboarding_why_here",
  onboarding_journaled_before: "onboarding_journaled_before",
  onboarding_reminder: "onboarding_reminder",
  onboarding_start_journaling: "onboarding_start_journaling",
  onboarding_mood: "onboarding_mood",
  onboarding_account: "onboarding_account",
  completed_onboarding: "completed_onboarding",

  started_recording: "started_recording",
  finished_recording: "finished_recording",
  changed_voice_prompt: "changed_voice_prompt",
  used_voice_prompt: "used_voice_prompt",
  deleted_recording: "deleted_recording",

  opened_ask_past: "opened_ask_past",
  asked_past_question: "asked_past_question",
  clicked_ask_past_example: "clicked_ask_past_example",
  opened_sources: "opened_sources",

  opened_insights: "opened_insights",
  opened_ai_patterns: "opened_ai_patterns",
  opened_weekly_reflection: "opened_weekly_reflection",
  opened_monthly_reflection: "opened_monthly_reflection",
  opened_statistics: "opened_statistics",
  opened_mood: "opened_mood",
  saved_mood: "saved_mood",

  opened_signup: "opened_signup",
  created_account: "created_account",
  cancelled_signup: "cancelled_signup",
};