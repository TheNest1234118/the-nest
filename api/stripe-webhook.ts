import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
  
    for await (const chunk of readable) {
      chunks.push(
        typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk)
      );
    }
  
    return Buffer.concat(chunks);
  }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return res.status(500).send("Missing env vars");
  }

  const stripe = new Stripe(stripeKey);
  const supabase = createClient(supabaseUrl, serviceKey);

  const sig = req.headers["stripe-signature"];

  let event: Stripe.Event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);
  } catch (err: any) {
    console.error("WEBHOOK SIGNATURE ERROR:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const subscriptionId = session.subscription as string;

      if (userId) {
        await supabase.from("profiles").upsert({
          user_id: userId,
          plan: "supporter",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      const isActive =
        subscription.status === "active" || subscription.status === "trialing";

      if (userId) {
        await supabase.from("profiles").upsert({
          user_id: userId,
          plan: isActive ? "supporter" : "free",
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(500).send(error.message || "Webhook failed");
  }
}