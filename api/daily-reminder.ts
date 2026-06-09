import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const key = process.env.ONESIGNAL_REST_API_KEY || "";

  return res.status(200).json({
    hasKey: Boolean(key),
    keyStart: key.substring(0, 15),
    keyLength: key.length,
    appId: process.env.ONESIGNAL_APP_ID || null
  });
}