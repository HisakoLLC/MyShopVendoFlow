import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { dodoClient } from "@/lib/payments/dodo-client"
import { getSupabaseUrl } from "@/lib/supabase/env"

const supabaseUrl = getSupabaseUrl()
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[webhooks][dodo] Supabase URL or service role key not configured. Webhook handler will fail."
  )
}

const adminClient =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null

export async function POST(req: NextRequest) {
  try {
    if (!adminClient) {
      return NextResponse.json(
        { error: "Server not configured for webhook handling." },
        { status: 500 }
      )
    }

    // 1. Get webhook signature and body
    const signature = req.headers.get("webhook-signature")
    const rawBody = await req.text()

    // 2. Verify signature
    if (!signature || !dodoClient.verifyWebhookSignature(rawBody, signature)) {
      // eslint-disable-next-line no-console
      console.error("[webhooks][dodo] Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // 3. Parse event
    const event = JSON.parse(rawBody) as { type: string; data: any }
    const { type, data } = event

    // eslint-disable-next-line no-console
    console.log("📥 Dodo webhook received:", type)

    // 4. Handle event
    switch (type) {
      case "subscription.created":
      case "subscription.activated":
        await handleSubscriptionActivated(adminClient, data)
        break

      case "subscription.renewed":
      case "payment.succeeded":
        await handlePaymentSucceeded(adminClient, data)
        break

      case "payment.failed":
        await handlePaymentFailed(adminClient, data)
        break

      case "subscription.cancelled":
        await handleSubscriptionCancelled(adminClient, data)
        break

      case "subscription.expired":
        await handleSubscriptionExpired(adminClient, data)
        break

      default:
        // eslint-disable-next-line no-console
        console.log("[webhooks][dodo] Unhandled webhook type:", type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ [webhooks][dodo] Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleSubscriptionActivated(supabase: any, data: any) {
  const metadata = data.metadata || {}
  const accountId = metadata.vendoflow_account_id
  const planTier = metadata.plan_tier

  if (!accountId) {
    // eslint-disable-next-line no-console
    console.error("[webhooks][dodo] No account_id in subscription metadata")
    return
  }

  const currentPeriodStart = data.current_period_start
  const currentPeriodEnd = data.current_period_end

  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      dodo_customer_id: data.customer_id,
      dodo_subscription_id: data.id,
      subscription_status: "active",
      plan_tier: planTier,
      subscription_started_at: new Date().toISOString(),
      subscription_current_period_start: currentPeriodStart,
      subscription_current_period_end: currentPeriodEnd,
      next_payment_date: currentPeriodEnd,
    })
    .eq("account_id", accountId)

  if (updateError) {
    // eslint-disable-next-line no-console
    console.error("[webhooks][dodo] Failed to update account:", updateError)
    return
  }

  await supabase.from("subscription_events").insert({
    account_id: accountId,
    event_type: "subscription_activated",
    dodo_event_id: data.id,
    subscription_id: data.id,
    amount: data.plan?.amount,
    currency: "KES",
    status: "success",
    event_data: data,
  })
}

async function handlePaymentSucceeded(supabase: any, data: any) {
  const subscriptionId = data.subscription_id || data.id

  const { data: account } = await supabase
    .from("accounts")
    .select("account_id")
    .eq("dodo_subscription_id", subscriptionId)
    .single()

  if (!account) {
    // eslint-disable-next-line no-console
    console.error(
      "[webhooks][dodo] Account not found for subscription:",
      subscriptionId
    )
    return
  }

  const amount = data.amount || data.plan?.amount
  const paidAt = data.paid_at || new Date().toISOString()
  const nextPaymentDate = data.next_payment_date || data.current_period_end

  await supabase
    .from("accounts")
    .update({
      subscription_status: "active",
      last_payment_date: paidAt,
      last_payment_amount: amount,
      next_payment_date: nextPaymentDate,
      subscription_current_period_end: nextPaymentDate,
    })
    .eq("account_id", account.account_id)

  await supabase.from("subscription_events").insert({
    account_id: account.account_id,
    event_type: "payment_succeeded",
    dodo_event_id: data.id,
    subscription_id: subscriptionId,
    amount,
    currency: "KES",
    status: "success",
    event_data: data,
  })
}

async function handlePaymentFailed(supabase: any, data: any) {
  const subscriptionId = data.subscription_id

  const { data: account } = await supabase
    .from("accounts")
    .select("account_id, business_name, owner_email")
    .eq("dodo_subscription_id", subscriptionId)
    .single()

  if (!account) return

  await supabase
    .from("accounts")
    .update({
      subscription_status: "past_due",
    })
    .eq("account_id", account.account_id)

  await supabase.from("subscription_events").insert({
    account_id: account.account_id,
    event_type: "payment_failed",
    dodo_event_id: data.id,
    subscription_id: subscriptionId,
    amount: data.amount,
    currency: "KES",
    status: "failed",
    event_data: data,
  })

  // TODO: send payment failure notification to account owner
}

async function handleSubscriptionCancelled(supabase: any, data: any) {
  const subscriptionId = data.id

  const { data: account } = await supabase
    .from("accounts")
    .select("account_id")
    .eq("dodo_subscription_id", subscriptionId)
    .single()

  if (!account) return

  await supabase
    .from("accounts")
    .update({
      subscription_status: "cancelled",
    })
    .eq("account_id", account.account_id)

  await supabase.from("subscription_events").insert({
    account_id: account.account_id,
    event_type: "subscription_cancelled",
    dodo_event_id: data.id,
    subscription_id: subscriptionId,
    status: "cancelled",
    event_data: data,
  })
}

async function handleSubscriptionExpired(supabase: any, data: any) {
  const subscriptionId = data.id

  const { data: account } = await supabase
    .from("accounts")
    .select("account_id")
    .eq("dodo_subscription_id", subscriptionId)
    .single()

  if (!account) return

  await supabase
    .from("accounts")
    .update({
      subscription_status: "expired",
    })
    .eq("account_id", account.account_id)

  await supabase.from("subscription_events").insert({
    account_id: account.account_id,
    event_type: "subscription_expired",
    dodo_event_id: data.id,
    subscription_id: subscriptionId,
    status: "expired",
    event_data: data,
  })
}

