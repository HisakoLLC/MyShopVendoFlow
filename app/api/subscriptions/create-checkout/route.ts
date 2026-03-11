import { NextRequest, NextResponse } from "next/server"
import { requireAccountAccess, requireAuth } from "@/lib/api/auth-helper"
import { dodoClient } from "@/lib/payments/dodo-client"

export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const { user, supabase, error: authError } = await requireAuth(req)
  if (authError || !user) return authError

  // 2. Get account access
  const { accountId, error: accountError } = await requireAccountAccess(supabase, user.id)
  if (accountError) return accountError

  // 3. Parse request
  const body = await req.json().catch(() => null) as { planTier?: string } | null
  const planTier = body?.planTier

  // 4. Validate plan
  if (!planTier || !["starter", "core", "scale"].includes(planTier)) {
    return NextResponse.json(
      { error: "Invalid plan tier. Must be: starter, core, or scale" },
      { status: 400 }
    )
  }

  // 5. Get account details
  const { data: account, error: accountLoadError } = await supabase
    .from("accounts")
    .select("account_id, business_name, owner_email")
    .eq("account_id", accountId)
    .single()

  if (accountLoadError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  try {
    const phone =
      (user as any).phone ||
      (user as any).user_metadata?.phone ||
      undefined

    // 6. Build a valid absolute return URL
    const envBase = process.env.NEXT_PUBLIC_APP_URL
    const origin =
      envBase && envBase.startsWith("http")
        ? envBase.replace(/\/$/, "")
        : new URL(req.url).origin
    const returnUrl = `${origin}/settings?tab=billing&payment=success`

    // 7. Create Dodo checkout session
    const result = await dodoClient.createCheckoutSession({
      customerEmail: account.owner_email,
      customerName: account.business_name,
      customerPhone: phone,
      planTier: planTier as "starter" | "core" | "scale",
      accountId: account.account_id,
      returnUrl,
    })

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error("Checkout creation failed:", result.error)
      return NextResponse.json(
        { error: result.error || "Failed to create checkout session" },
        { status: 400 }
      )
    }

    // 8. Update account with pending subscription
    await supabase
      .from("accounts")
      .update({
        plan_tier: planTier,
        subscription_status: "pending",
      })
      .eq("account_id", account.account_id)

    // 9. Return checkout URL
    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Subscription checkout creation error:", error)
    return NextResponse.json(
      { error: "Failed to create subscription checkout" },
      { status: 500 }
    )
  }
}

