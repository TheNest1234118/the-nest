export default async function handler(req: Request) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return new Response("Missing OneSignal env vars", { status: 500 });
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      included_segments: ["Subscribed Users"],
      headings: { en: "The Nest" },
      contents: {
        en: "A quiet moment is here if you need it.",
      },
      url: "https://the-nest-dun.vercel.app/home",
    }),
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}