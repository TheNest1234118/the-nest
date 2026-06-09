import { track } from "@vercel/analytics";

export type NotificationCategory =
  | "evening_reflection"
  | "sleep_unwind"
  | "thought_reminders"
  | "weekly_reflection";

export interface NestNotificationPreferences {
  enabled: boolean;
  evening_reflection: boolean;
  sleep_unwind: boolean;
  thought_reminders: boolean;
  weekly_reflection: boolean;
}

export const NOTIFICATION_PREFS_KEY = "nest_notification_preferences";
export const LAST_RETURN_AFTER_NOTIFICATION_KEY =
  "nest_last_return_after_notification";

export const DEFAULT_NOTIFICATION_PREFS: NestNotificationPreferences = {
  enabled: false,
  evening_reflection: true,
  sleep_unwind: true,
  thought_reminders: true,
  weekly_reflection: true,
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
      nest_cat_evening_reflection:
        prefs.enabled && prefs.evening_reflection ? "true" : "false",
      nest_cat_sleep_unwind:
        prefs.enabled && prefs.sleep_unwind ? "true" : "false",
      nest_cat_thought_reminders:
        prefs.enabled && prefs.thought_reminders ? "true" : "false",
      nest_cat_weekly_reflection:
        prefs.enabled && prefs.weekly_reflection ? "true" : "false",
      nest_timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    });
  });
}

export function trackNotificationCategorySelected(
  category: NotificationCategory,
  enabled: boolean
) {
  track("Notification category selected", {
    category,
    enabled,
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
      category: category || "unknown",
    });

    track("Return session after notification", {
      category: category || "unknown",
    });
  }
}