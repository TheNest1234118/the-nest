export default function handler(req: any, res: any) {
  console.log("API HIT /api/daily-reminder");

  return res.status(200).json({
    ok: true,
    message: "daily reminder works",
    time: new Date().toISOString()
  });
}