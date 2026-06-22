import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Please sign in first." });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_SUPPORTER_PRICE_ID;
    const appUrl = process.env.PUBLIC_APP_URL || "https://www.thenestapp.space";

    if (!supabaseUrl || !anonKey || !serviceKey || !stripeKey || !priceId) {
      return res.status(500).json({ error: "Missing Stripe/Supabase env vars" });
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = customer.id;

      await supabase.from("profiles").upsert({
        user_id: user.id,
        plan: "free",
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/settings?supporter=success`,
      cancel_url: `${appUrl}/settings?supporter=cancelled`,
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("CHECKOUT ERROR:", error);
    return res.status(500).json({ error: error.message || "Checkout failed" });
  }
}