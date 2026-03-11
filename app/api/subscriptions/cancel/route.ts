import { NextRequest, NextResponse } from "next/server"
import { requireAccountAccess, requireAuth } from "@/lib/api/auth-helper"
import { dodoClient } from "@/lib/payments/dodo-client"

export async function POST(req: NextRequest) {
  const { user, supabase, error: authError } = await requireAuth(req)
  if (authError || !user) return authError

  const { accountId, error: accountError } = await requireAccountAccess(supabase, user.id)
  if (accountError) return accountError

  const { data: account, error: loadError } = await supabase
    .from("accounts")
    .select("dodo_subscription_id, subscription_status")
    .eq("account_id", accountId)
    .single()

  if (loadError) {
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 400 })
  }

  if (!account?.dodo_subscription_id) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 400 })
  }

  if (account.subscription_status === "cancelled") {
    return NextResponse.json({ error: "Subscription already cancelled" }, { status: 400 })
  }

  try {
    const result = await dodoClient.cancelSubscription(account.dodo_subscription_id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to cancel subscription" },
        { status: 400 }
      )
    }

    await supabase
      .from("accounts")
      .update({
        subscription_status: "cancelling",
      })
      .eq("account_id", accountId)

    return NextResponse.json({
      success: true,
      message: "Subscription cancellation requested",
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[subscriptions][cancel] Cancellation error:", error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}

