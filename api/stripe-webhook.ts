import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(
  readable: any
): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of readable) {
    chunks.push(
      typeof chunk === "string"
        ? Buffer.from(chunk)
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

function getStripeId(
  value: unknown
): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as any).id === "string"
  ) {
    return (value as any).id;
  }

  return null;
}

function isActiveSubscriptionStatus(
  status: string
) {
  return (
    status === "active" ||
    status === "trialing"
  );
}

function unixToIso(
  value: unknown
): string | null {
  const seconds = Number(value);

  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return null;
  }

  return new Date(
    seconds * 1000
  ).toISOString();
}

function getInvoicePeriod(
  invoice: Stripe.Invoice
) {
  const lines =
    invoice.lines?.data || [];

  if (lines.length === 0) {
    return {
      start: null,
      end: null,
    };
  }

  const starts = lines
    .map((line) =>
      Number(line.period?.start || 0)
    )
    .filter((value) => value > 0);

  const ends = lines
    .map((line) =>
      Number(line.period?.end || 0)
    )
    .filter((value) => value > 0);

  return {
    start:
      starts.length > 0
        ? unixToIso(
            Math.min(...starts)
          )
        : null,

    end:
      ends.length > 0
        ? unixToIso(
            Math.max(...ends)
          )
        : null,
  };
}

function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const rawInvoice =
    invoice as any;

  return (
    getStripeId(
      rawInvoice.subscription
    ) ||
    getStripeId(
      rawInvoice.parent
        ?.subscription_details
        ?.subscription
    ) ||
    null
  );
}

async function findUserId({
  supabase,
  stripe,
  explicitUserId,
  customerId,
  subscriptionId,
}: {
  supabase: SupabaseClient;
  stripe: Stripe;
  explicitUserId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  if (explicitUserId) {
    return explicitUserId;
  }

  if (subscriptionId) {
    try {
      const subscription =
        await stripe.subscriptions.retrieve(
          subscriptionId
        );

      const userId =
        subscription.metadata
          ?.user_id;

      if (userId) {
        return userId;
      }
    } catch (error) {
      console.error(
        "STRIPE SUBSCRIPTION USER LOOKUP ERROR:",
        error
      );
    }
  }

  if (customerId) {
    const {
      data: profile,
      error,
    } = await supabase
      .from("profiles")
      .select("user_id")
      .eq(
        "stripe_customer_id",
        customerId
      )
      .maybeSingle();

    if (error) {
      console.error(
        "PROFILE CUSTOMER LOOKUP ERROR:",
        error
      );
    }

    if (profile?.user_id) {
      return String(
        profile.user_id
      );
    }
  }

  return null;
}

async function writeAuditLog({
  supabase,
  userId,
  eventType,
  details,
}: {
  supabase: SupabaseClient;
  userId: string | null;
  eventType: string;
  details: Record<
    string,
    unknown
  >;
}) {
  const { error } = await supabase
    .from("award_audit_log")
    .insert({
      user_id: userId,
      memo_id: null,
      event_type: eventType,
      details,
    });

  if (error) {
    console.error(
      "STRIPE AWARD AUDIT ERROR:",
      error
    );
  }
}

async function updateProfileFromSubscription({
  supabase,
  subscription,
  fallbackUserId,
}: {
  supabase: SupabaseClient;
  subscription: Stripe.Subscription;
  fallbackUserId?: string | null;
}) {
  const userId =
    subscription.metadata
      ?.user_id ||
    fallbackUserId ||
    null;

  if (!userId) {
    console.error(
      "SUBSCRIPTION HAS NO USER ID:",
      subscription.id
    );

    return null;
  }

  const active =
    isActiveSubscriptionStatus(
      subscription.status
    );

  const customerId =
    getStripeId(
      subscription.customer
    );

  const {
    error: profileError,
  } = await supabase
    .from("profiles")
    .upsert({
      user_id: userId,

      plan: active
        ? "supporter"
        : "free",

      stripe_customer_id:
        customerId,

      stripe_subscription_id:
        subscription.id,

      subscription_status:
        subscription.status,

      updated_at:
        new Date().toISOString(),
    });

  if (profileError) {
    throw profileError;
  }

  await writeAuditLog({
    supabase,
    userId,
    eventType:
      active
        ? "premium_activated"
        : "premium_deactivated",

    details: {
      subscription_id:
        subscription.id,

      customer_id:
        customerId,

      subscription_status:
        subscription.status,

      premium_active: active,
    },
  });

  return userId;
}

async function handleCheckoutCompleted({
  session,
  stripe,
  supabase,
}: {
  session: Stripe.Checkout.Session;
  stripe: Stripe;
  supabase: SupabaseClient;
}) {
  if (
    session.mode !== "subscription"
  ) {
    return;
  }

  const userId =
    session.metadata?.user_id ||
    null;

  const subscriptionId =
    getStripeId(
      session.subscription
    );

  const customerId =
    getStripeId(
      session.customer
    );

  if (!userId) {
    console.error(
      "CHECKOUT SESSION HAS NO USER ID:",
      session.id
    );

    return;
  }

  if (subscriptionId) {
    const subscription =
      await stripe.subscriptions.retrieve(
        subscriptionId
      );

    await updateProfileFromSubscription({
      supabase,
      subscription,
      fallbackUserId: userId,
    });

    return;
  }

  /*
   * Fallback: Checkout completed but subscription
   * was not expandable or not yet available.
   */
  const {
    error: profileError,
  } = await supabase
    .from("profiles")
    .upsert({
      user_id: userId,

      plan:
        session.payment_status ===
          "paid" ||
        session.payment_status ===
          "no_payment_required"
          ? "supporter"
          : "free",

      stripe_customer_id:
        customerId,

      stripe_subscription_id:
        subscriptionId,

      subscription_status:
        session.payment_status ===
          "paid"
          ? "active"
          : session.payment_status,

      updated_at:
        new Date().toISOString(),
    });

  if (profileError) {
    throw profileError;
  }
}

async function handleInvoicePaid({
  invoice,
  stripe,
  supabase,
}: {
  invoice: Stripe.Invoice;
  stripe: Stripe;
  supabase: SupabaseClient;
}) {
  /*
   * Only real paid subscription invoices count.
   *
   * This excludes free trials and zero-value invoices.
   */
  if (
    Number(invoice.amount_paid || 0) <=
    0
  ) {
    return;
  }

  const subscriptionId =
    getInvoiceSubscriptionId(
      invoice
    );

  if (!subscriptionId) {
    /*
     * One-off invoices must not count as Premium months.
     */
    return;
  }

  const customerId =
    getStripeId(
      invoice.customer
    );

  const explicitUserId =
    invoice.metadata?.user_id ||
    null;

  const userId =
    await findUserId({
      supabase,
      stripe,
      explicitUserId,
      customerId,
      subscriptionId,
    });

  if (!userId) {
    throw new Error(
      `Could not resolve user for paid invoice ${invoice.id}`
    );
  }

  const period =
    getInvoicePeriod(invoice);

  /*
   * The database has a unique constraint on stripe_invoice_id.
   * Repeated Stripe webhook delivery therefore cannot count twice.
   */
  const {
    error: monthInsertError,
  } = await supabase
    .from("award_paid_months")
    .upsert(
      {
        user_id: userId,

        stripe_customer_id:
          customerId,

        stripe_subscription_id:
          subscriptionId,

        stripe_invoice_id:
          invoice.id,

        billing_period_start:
          period.start,

        billing_period_end:
          period.end,

        amount_paid:
          Number(
            invoice.amount_paid ||
              0
          ),

        currency:
          String(
            invoice.currency ||
              "chf"
          ).toLowerCase(),

        paid_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "stripe_invoice_id",

        /*
         * Never rewrite the original paid-month record
         * when Stripe retries the same webhook.
         */
        ignoreDuplicates: true,
      }
    );

  if (monthInsertError) {
    throw monthInsertError;
  }

  /*
   * Ensure Premium is active according to Stripe's
   * current subscription object.
   */
  try {
    const subscription =
      await stripe.subscriptions.retrieve(
        subscriptionId
      );

    await updateProfileFromSubscription({
      supabase,
      subscription,
      fallbackUserId: userId,
    });
  } catch (subscriptionError) {
    console.error(
      "PAID INVOICE SUBSCRIPTION REFRESH ERROR:",
      subscriptionError
    );
  }

  const {
    error: progressError,
  } = await supabase.rpc(
    "recalculate_award_progress",
    {
      p_user_id: userId,
    }
  );

  if (progressError) {
    throw progressError;
  }

  await writeAuditLog({
    supabase,
    userId,
    eventType:
      "premium_month_paid",

    details: {
      stripe_invoice_id:
        invoice.id,

      stripe_subscription_id:
        subscriptionId,

      stripe_customer_id:
        customerId,

      amount_paid:
        invoice.amount_paid,

      currency:
        invoice.currency,

      billing_period_start:
        period.start,

      billing_period_end:
        period.end,

      billing_reason:
        invoice.billing_reason,
    },
  });
}

async function handleInvoicePaymentFailed({
  invoice,
  stripe,
  supabase,
}: {
  invoice: Stripe.Invoice;
  stripe: Stripe;
  supabase: SupabaseClient;
}) {
  const subscriptionId =
    getInvoiceSubscriptionId(
      invoice
    );

  const customerId =
    getStripeId(
      invoice.customer
    );

  const userId =
    await findUserId({
      supabase,
      stripe,

      explicitUserId:
        invoice.metadata
          ?.user_id ||
        null,

      customerId,
      subscriptionId,
    });

  if (!userId) {
    return;
  }

  /*
   * We do not immediately erase historical progress.
   * The subscription.updated event remains the source
   * of truth for whether Premium is active.
   */
  await writeAuditLog({
    supabase,
    userId,
    eventType:
      "premium_payment_failed",

    details: {
      stripe_invoice_id:
        invoice.id,

      stripe_subscription_id:
        subscriptionId,

      amount_due:
        invoice.amount_due,

      currency:
        invoice.currency,
    },
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .send(
        "Method not allowed"
      );
  }

  const stripeKey =
    process.env
      .STRIPE_SECRET_KEY;

  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET;

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env
      .VITE_SUPABASE_URL;

  const serviceKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !stripeKey ||
    !webhookSecret ||
    !supabaseUrl ||
    !serviceKey
  ) {
    return res
      .status(500)
      .send(
        "Missing environment variables"
      );
  }

  const signature =
    req.headers[
      "stripe-signature"
    ];

  if (
    !signature ||
    typeof signature !== "string"
  ) {
    return res
      .status(400)
      .send(
        "Missing Stripe signature"
      );
  }

  const stripe =
    new Stripe(stripeKey);

  /*
   * Service role is used only inside this trusted server route.
   * Never expose this key to the browser.
   */
  const supabase =
    createClient(
      supabaseUrl,
      serviceKey
    );

  let event: Stripe.Event;

  try {
    const rawBody =
      await readRawBody(req);

    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error: any) {
    console.error(
      "WEBHOOK SIGNATURE ERROR:",
      error.message
    );

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data
            .object as Stripe.Checkout.Session;

        await handleCheckoutCompleted({
          session,
          stripe,
          supabase,
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription =
          event.data
            .object as Stripe.Subscription;

        const customerId =
          getStripeId(
            subscription.customer
          );

        const fallbackUserId =
          await findUserId({
            supabase,
            stripe,

            explicitUserId:
              subscription.metadata
                ?.user_id ||
              null,

            customerId,
            subscriptionId:
              subscription.id,
          });

        await updateProfileFromSubscription({
          supabase,
          subscription,
          fallbackUserId,
        });

        break;
      }

      case "invoice.paid": {
        const invoice =
          event.data
            .object as Stripe.Invoice;

        await handleInvoicePaid({
          invoice,
          stripe,
          supabase,
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice =
          event.data
            .object as Stripe.Invoice;

        await handleInvoicePaymentFailed({
          invoice,
          stripe,
          supabase,
        });

        break;
      }

      default: {
        /*
         * Acknowledge unhandled Stripe events.
         */
        break;
      }
    }

    return res.status(200).json({
      received: true,
      eventType: event.type,
    });
  } catch (error: any) {
    console.error(
      "STRIPE WEBHOOK ERROR:",
      {
        eventId: event.id,
        eventType: event.type,
        error:
          error.message ||
          error,
      }
    );

    /*
     * Returning 500 makes Stripe retry the event.
     * Database writes are idempotent through unique constraints.
     */
    return res.status(500).send(
      error.message ||
        "Webhook failed"
    );
  }
}