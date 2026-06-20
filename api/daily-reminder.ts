import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const messages = [
  "A quiet moment, if you want one.",
  "The Nest is here when you have space to reflect.",
  "A gentle check-in, only if it feels right.",
];

function getLocalNow(timezone: string) {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  return {
    time: `${get("hour")}:${get("minute")}`,
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      get("weekday")
    ),
    sentKey: `${get("year")}-${get("month")}-${get("day")}-${get("hour")}:${get(
      "minute"
    )}`,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = req.query.secret || req.headers["x-cron-secret"];

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

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

  if (error) return res.status(500).json({ ok: false, error: error.message });

  const dueUsers = (prefs || []).filter((pref) => {
    const local = getLocalNow(pref.reminder_timezone || "Europe/Zurich");

    return (
      local.time === pref.reminder_time &&
      pref.reminder_days?.includes(local.day) &&
      pref.last_reminder_sent_key !== local.sentKey
    );
  });

  if (dueUsers.length === 0) {
    return res.status(200).json({
      ok: true,
      sent: 0,
      checked: (prefs || []).map((pref) => {
        const local = getLocalNow(pref.reminder_timezone || "Europe/Zurich");
  
        return {
          id: pref.onesignal_subscription_id,
          enabled: pref.enabled,
          db_time: pref.reminder_time,
          local_time: local.time,
          db_days: pref.reminder_days,
          local_day: local.day,
          last_sent: pref.last_reminder_sent_key,
          sent_key: local.sentKey,
          time_match: local.time === pref.reminder_time,
          day_match: pref.reminder_days?.includes(local.day),
          not_sent_yet: pref.last_reminder_sent_key !== local.sentKey,
        };
      }),
    });
  }
  const message =
  dueUsers[0]?.reminder_message ||
  messages[Math.floor(Math.random() * messages.length)];

  const payload = {
    app_id: appId,
    include_subscription_ids: dueUsers.map((u) => u.onesignal_subscription_id),
    headings: { en: "The Nest" },
    contents: { en: message },
    url: "https://www.thenestapp.space/home?notification=onesignal&category=reminder",
  };

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const onesignalText = await response.text();

  let onesignalJson: any = null;
  try {
    onesignalJson = JSON.parse(onesignalText);
  } catch {}
  
  if (response.ok && onesignalJson?.id) {
    for (const user of dueUsers) {
      const local = getLocalNow(user.reminder_timezone || "Europe/Zurich");
  
      await supabase
        .from("notification_preferences")
        .update({ last_reminder_sent_key: local.sentKey })
        .eq("onesignal_subscription_id", user.onesignal_subscription_id);
    }
  }

  // TEMPORÄR: nicht als gesendet markieren, damit du mehrfach testen kannst
  /*
  for (const user of dueUsers) {
    const local = getLocalNow(user.reminder_timezone || "Europe/Zurich");

    await supabase
      .from("notification_preferences")
      .update({ last_reminder_sent_key: local.sentKey })
      .eq("onesignal_subscription_id", user.onesignal_subscription_id);
  }
  */

  return res.status(response.status).json({
    ok: response.ok,
    sent: dueUsers.length,
    payload,
    dueUsers: dueUsers.map((u) => ({
      id: u.onesignal_subscription_id,
      reminder_time: u.reminder_time,
      timezone: u.reminder_timezone,
    })),
    onesignal: onesignalJson || onesignalText,
  });
}