import { track } from "@vercel/analytics";

export type ReminderPreset = "before_bed" | "evening" | "morning" | "custom";
export type ReminderFrequency = "daily" | "selected_days" | "weekly";

export interface NestNotificationPreferences {
  enabled: boolean;
  reminder_time: string;
  reminder_timezone: string;
  reminder_days: number[];
  reminder_frequency: ReminderFrequency;
  preset: ReminderPreset;
}

export const NOTIFICATION_PREFS_KEY = "nest_notification_preferences";
export const LAST_RETURN_AFTER_NOTIFICATION_KEY =
  "nest_last_return_after_notification";

export const DEFAULT_NOTIFICATION_PREFS: NestNotificationPreferences = {
  enabled: false,
  reminder_time: "21:00",
  reminder_timezone:
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich",
  reminder_days: [1, 2, 3, 4, 5, 6, 0],
  reminder_frequency: "daily",
  preset: "before_bed",
};

declare global {
  interface Window {
    OneSignalDeferred?: any[];
  }
}

export function readNotificationPreferences(): NestNotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;

    return {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(JSON.parse(raw) as Partial<NestNotificationPreferences>),
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export async function writeNotificationPreferences(
  prefs: NestNotificationPreferences
) {
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  await syncOneSignalNotificationTags(prefs);
}

export async function requestNestNotifications() {
  if (!window.OneSignalDeferred) return false;

  let granted = false;

  await window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.Notifications.requestPermission();
    granted = Notification.permission === "granted";

    if (granted) {
      track("Notification enabled");
    }
  });

  return granted;
}

export async function syncOneSignalNotificationTags(
  prefs: NestNotificationPreferences
) {
  if (!window.OneSignalDeferred) return;

  await window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.User.addTags({
      nest_notifications_enabled: prefs.enabled ? "true" : "false",
      nest_reminder_time: prefs.reminder_time,
      nest_reminder_timezone: prefs.reminder_timezone,
      nest_reminder_days: prefs.reminder_days.join(","),
      nest_reminder_frequency: prefs.reminder_frequency,
      nest_reminder_preset: prefs.preset,
    });
  });
}

export function trackReminderPreferenceChanged(
  prefs: NestNotificationPreferences
) {
  track("Reminder preference changed", {
    enabled: prefs.enabled,
    reminder_time: prefs.reminder_time,
    reminder_timezone: prefs.reminder_timezone,
    reminder_frequency: prefs.reminder_frequency,
    preset: prefs.preset,
    reminder_days: prefs.reminder_days.join(","),
  });
}

export function markThoughtSavedForNotifications() {
  try {
    localStorage.setItem("nest_last_thought_saved_at", String(Date.now()));
  } catch {}

  if (!window.OneSignalDeferred) return;

  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.User.addTags({
      nest_has_saved_thoughts: "true",
      nest_last_thought_saved_at: String(Date.now()),
    });
  });
}

export function trackNotificationOpenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("notification");
  const category = params.get("category");

  if (source === "onesignal") {
    localStorage.setItem(LAST_RETURN_AFTER_NOTIFICATION_KEY, String(Date.now()));

    track("Notification opened", {
      category: category || "reminder",
    });

    track("Return session after notification", {
      category: category || "reminder",
    });
  }
}