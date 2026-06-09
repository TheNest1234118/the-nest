import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return res.status(500).json({ ok: false, error: "Missing env vars" });
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      app_id: appId,
      included_segments: ["Total Subscriptions"],
      headings: { en: "The Nest" },
      contents: { en: "How are you feeling today?" },
      url: "https://the-nest-dun.vercel.app/home"
    })
  });

  const data = await response.text();

  return res.status(response.status).json({
    ok: response.ok,
    status: response.status,
    onesignal: data
  });
}