export default async function handler(req: any, res: any) {
  try {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    console.log("API HIT");
    console.log("Has appId:", !!appId);
    console.log("Has apiKey:", !!apiKey);

    if (!appId || !apiKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing OneSignal env vars",
        hasAppId: !!appId,
        hasApiKey: !!apiKey
      });
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ["Subscribed Users"],
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
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: String(error)
    });
  }
}