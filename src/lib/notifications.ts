import { track } from "@vercel/analytics";
import { supabase } from "@/lib/supabase";
export type ReminderPreset = "before_bed" | "evening" | "morning" | "custom";
export type ReminderFrequency = "daily" | "selected_days" | "weekly";
async function getOneSignalSubscriptionId(): Promise<string | null> {
  if (!window.OneSignalDeferred) return null;

  let subscriptionId: string | null = null;

  await window.OneSignalDeferred.push(async (OneSignal: any) => {
    subscriptionId = OneSignal.User.PushSubscription.id;

    console.log("Saving OneSignal subscription id", subscriptionId);
  });

  return subscriptionId;
}
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
 // await syncOneSignalNotificationTags(prefs);

  const onesignalSubscriptionId = await getOneSignalSubscriptionId();

  if (!onesignalSubscriptionId) return;

  await supabase.from("notification_preferences").upsert({
    onesignal_subscription_id: onesignalSubscriptionId,
    enabled: prefs.enabled,
    reminder_time: prefs.reminder_time,
    reminder_timezone: prefs.reminder_timezone,
    reminder_days: prefs.reminder_days,
    reminder_frequency: prefs.reminder_frequency,
    preset: prefs.preset,
    updated_at: new Date().toISOString(),
  });
}
export async function requestNestNotifications() {
  console.log("REQUEST FUNCTION START");
  console.log("OneSignalDeferred", window.OneSignalDeferred);
  console.log("permission before", Notification.permission);

  let granted = Notification.permission === "granted";

  if (!granted) {
    const result = await Notification.requestPermission();
    console.log("native permission result", result);
    granted = result === "granted";
  }

  if (!granted) return false;

  if (window.OneSignalDeferred) {
    await window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        console.log("OneSignal optIn start");

        await OneSignal.Notifications.requestPermission();
        await OneSignal.User.PushSubscription.optIn();

        await new Promise((resolve) => setTimeout(resolve, 3000));

        console.log("OneSignal user id", OneSignal.User.onesignalId);
        console.log("OneSignal optedIn", OneSignal.User.PushSubscription.optedIn);
        console.log("Push subscription id", OneSignal.User.PushSubscription.id);
      } catch (error) {
        console.log("OneSignal optIn failed", error);
      }
    });
  }

  track("Notification enabled");
  return true;
}

export async function syncOneSignalNotificationTags(
  prefs: NestNotificationPreferences
) {
  if (!window.OneSignalDeferred) return;

  await window.OneSignalDeferred.push(async (OneSignal: any) => {
    const externalId =
      localStorage.getItem("nest_onesignal_external_id") ||
      crypto.randomUUID();

    localStorage.setItem("nest_onesignal_external_id", externalId);

    await OneSignal.login(externalId);

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
    const externalId =
      localStorage.getItem("nest_onesignal_external_id") ||
      crypto.randomUUID();

    localStorage.setItem("nest_onesignal_external_id", externalId);

    await OneSignal.login(externalId);

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