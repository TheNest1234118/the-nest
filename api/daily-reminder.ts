// api/daily-reminder.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const messages = [
  "A quiet moment, if you want one.",
  "The Nest is here when you have space to reflect.",
  "A gentle check-in, only if it feels right.",
];

function getLocalTime(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  return {
    time: `${get("hour")}:${get("minute")}`,
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      get("weekday") || ""
    ),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!appId || !apiKey || !supabaseUrl || !serviceKey) {
    return res.status(500).json({ ok: false, error: "Missing env vars" });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: prefs, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("enabled", true);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  const dueUsers = (prefs || []).filter((pref) => {
    const local = getLocalTime(pref.reminder_timezone || "Europe/Zurich");

    return (
      local.time === pref.reminder_time &&
      pref.reminder_days?.includes(local.day)
    );
  });

  if (dueUsers.length === 0) {
    return res.status(200).json({ ok: true, sent: 0 });
  }

  const message = messages[Math.floor(Math.random() * messages.length)];

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      include_subscription_ids: dueUsers.map(
        (u) => u.onesignal_subscription_id
      ),
      headings: {
        en: "The Nest",
      },
      contents: {
        en: message,
      },
      url: "https://the-nest-dun.vercel.app/home?notification=onesignal&category=reminder",
    }),
  });

  const data = await response.text();

  return res.status(response.status).json({
    ok: response.ok,
    sent: dueUsers.length,
    onesignal: data,
  });
}