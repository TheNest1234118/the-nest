export default function handler(req: any, res: any) {
  const key = process.env.ONESIGNAL_REST_API_KEY || "";

  return res.status(200).json({
    keyStart: key.substring(0, 20),
    keyLength: key.length
  });
}