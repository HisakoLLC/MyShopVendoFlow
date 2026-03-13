import { NextRequest, NextResponse } from "next/server"
import { requireAccountAccess, requireAuth } from "@/lib/api/auth-helper"
import { dodoClient } from "@/lib/payments/dodo-client"

const planPriority = { starter: 1, core: 2, scale: 3 } as const

export async function POST(req: NextRequest) {
  const { user, supabase, error: authError } = await requireAuth(req)
  if (authError || !user) return authError

  const { accountId, error: accountError } = await requireAccountAccess(supabase, user.id)
  if (accountError) return accountError

  const body = (await req.json().catch(() => null)) as { newPlanTier?: string } | null
  const newPlanTier = body?.newPlanTier

  if (!newPlanTier || !["starter", "core", "scale"].includes(newPlanTier)) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 })
  }

  const { data: account, error: loadError } = await supabase
    .from("accounts")
    .select(
      "account_id, business_name, owner_email, plan_tier, dodo_subscription_id, dodo_customer_id, subscription_status"
    )
    .eq("account_id", accountId)
    .single()

  if (loadError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  if (account.plan_tier === newPlanTier) {
    return NextResponse.json(
      { error: "You are already on this plan" },
      { status: 400 }
    )
  }

  const currentPriority =
    planPriority[(account.plan_tier as keyof typeof planPriority) || "starter"] || 0
  const newPriority = planPriority[newPlanTier as keyof typeof planPriority]
  const isUpgrade = newPriority > currentPriority

  try {
    const envBase = process.env.NEXT_PUBLIC_APP_URL
    const origin =
      envBase && envBase.startsWith("http")
        ? envBase.replace(/\/$/, "")
        : new URL(req.url).origin

    const phone =
      (user as any).phone ||
      (user as any).user_metadata?.phone ||
      undefined

    if (account.dodo_subscription_id && account.subscription_status === "active") {
      // Simplest path: cancel current subscription and send user to checkout for new plan
      await dodoClient.cancelSubscription(account.dodo_subscription_id)

      // ✅ FIX: Immediately mark as pending to prevent webhook race condition
      await supabase
        .from("accounts")
        .update({
          subscription_status: "pending_plan_change",
          plan_tier: newPlanTier,
        })
        .eq("account_id", account.account_id)

      const checkoutResult = await dodoClient.createCheckoutSession({
        customerEmail: account.owner_email,
        customerName: account.business_name,
        customerPhone: phone,
        planTier: newPlanTier as "starter" | "core" | "scale",
        accountId: account.account_id,
        returnUrl: `${origin}/settings?tab=billing&plan_changed=true`,
      })

      if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
        // ✅ FIX: Rollback on failure
        await supabase
          .from("accounts")
          .update({
            subscription_status: "active",
            plan_tier: account.plan_tier,
          })
          .eq("account_id", account.account_id)

        return NextResponse.json(
          { error: checkoutResult.error || "Failed to create checkout session" },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        requiresCheckout: true,
        checkoutUrl: checkoutResult.checkoutUrl,
        message: isUpgrade
          ? "Redirecting to checkout to upgrade your plan"
          : "Redirecting to checkout for plan change",
      })
    }

    // No active subscription -> treat as new subscription on desired plan
    const checkoutResult = await dodoClient.createCheckoutSession({
      customerEmail: account.owner_email,
      customerName: account.business_name,
      customerPhone: phone,
      planTier: newPlanTier as "starter" | "core" | "scale",
      accountId: account.account_id,
      returnUrl: `${origin}/settings?tab=billing&payment=success`,
    })

    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
      return NextResponse.json(
        { error: checkoutResult.error || "Failed to create checkout session" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      requiresCheckout: true,
      checkoutUrl: checkoutResult.checkoutUrl,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Plan change error:", error)
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 })
  }
}

