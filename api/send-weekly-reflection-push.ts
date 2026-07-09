import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "";

  return {
    time: `${get("hour")}:${get("minute")}`,
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      get("weekday")
    ),
    sentKey: `weekly-${get("year")}-${get("month")}-${get("day")}`,
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
    .eq("enabled", true)
    .not("onesignal_subscription_id", "is", null);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  const dueUsers = (prefs || []).filter((pref) => {
    const local = getLocalNow(pref.reminder_timezone || "Europe/Zurich");

    return (
      local.day === 0 &&
      local.time === "20:00" &&
      pref.last_weekly_reflection_sent_key !== local.sentKey
    );
  });

  if (dueUsers.length === 0) {
    return res.status(200).json({ ok: true, sent: 0 });
  }

  const payload = {
    app_id: appId,
    include_subscription_ids: dueUsers.map((u) => u.onesignal_subscription_id),
    headings: { en: "The Nest" },
    contents: {
      en: "Your week has a story. Ready to see it?",
    },
    url: "https://www.thenestapp.space/insights/weekly?notification=weekly_reflection",
  };

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}

  if (response.ok && json?.id) {
    for (const user of dueUsers) {
      const local = getLocalNow(user.reminder_timezone || "Europe/Zurich");

      await supabase
        .from("notification_preferences")
        .update({
          last_weekly_reflection_sent_key: local.sentKey,
        })
        .eq("onesignal_subscription_id", user.onesignal_subscription_id);
    }
  }

  return res.status(response.status).json({
    ok: response.ok,
    sent: dueUsers.length,
    onesignal: json || text,
  });
}