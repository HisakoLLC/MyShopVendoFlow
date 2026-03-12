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
    .select("dodo_customer_id")
    .eq("account_id", accountId)
    .single()

  if (loadError) {
    return NextResponse.json({ error: "Failed to load account" }, { status: 400 })
  }

  if (!account?.dodo_customer_id) {
    return NextResponse.json(
      { error: "No customer ID found. Please create a subscription first." },
      { status: 400 }
    )
  }

  try {
    const envBase = process.env.NEXT_PUBLIC_APP_URL
    const origin =
      envBase && envBase.startsWith("http")
        ? envBase.replace(/\/$/, "")
        : new URL(req.url).origin
    const returnUrl = `${origin}/settings?tab=billing`

    const result = await dodoClient.createCustomerPortalSession(
      account.dodo_customer_id,
      returnUrl
    )

    if (!result.success || !result.portalUrl) {
      return NextResponse.json(
        { error: result.error || "Failed to create portal session" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      portalUrl: result.portalUrl,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Customer portal error:", error)
    return NextResponse.json(
      { error: "Failed to create customer portal session" },
      { status: 500 }
    )
  }
}

