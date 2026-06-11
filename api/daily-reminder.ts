import type { VercelRequest, VercelResponse } from "@vercel/node";

const messages: Record<number, string> = {
  1: "how is your mind tonight?",
  2: "anything you have been carrying around today?",
  3: "you do not have to hold every thought alone.",
  4: "take a minute for yourself tonight.",
  5: "before the weekend starts, what is on your mind?",
  6: "slow down for a moment. the nest is here.",
  0: "new week tomorrow. anything you want to let go of first?"
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appId = process.env.ONESIGNAL_APP_ID!;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY!;

  const day = new Date().getDay();
  const message = messages[day];

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
      contents: { en: message },
      url: "https://the-nest-dun.vercel.app/home",

      delayed_option: "timezone",
      delivery_time_of_day: "21:00",
    })
  });

  const data = await response.text();

  return res.status(response.status).json({
    ok: response.ok,
    status: response.status,
    message,
    onesignal: data
  });
}