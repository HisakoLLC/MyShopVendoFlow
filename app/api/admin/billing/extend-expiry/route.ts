import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireSuperAdmin, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireSuperAdmin()
    if (errorResponse) return errorResponse

    const { accountId, newExpiryDate, reason } = await req.json()

    if (!accountId || !newExpiryDate) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, newExpiryDate" },
        { status: 400 }
      )
    }

    // ── Update public.accounts ────────────────────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from("accounts")
      .update({
        subscription_current_period_end: newExpiryDate,
        next_payment_date:               newExpiryDate,
        subscription_status:             "active", // reactivate if past_due
      })
      .eq("account_id", accountId)

    if (updateErr) {
      console.error("[extend-expiry] Update failed:", updateErr)
      return NextResponse.json({ error: "Failed to extend expiry" }, { status: 500 })
    }

    // ── Subscription event ────────────────────────────────────────────────────
    await supabaseAdmin.from("subscription_events").insert({
      account_id: accountId,
      event_type: "expiry_extended_by_admin",
      status:     "success",
      event_data: {
        new_expiry: newExpiryDate,
        reason:     reason ?? null,
        admin:      adminUser.email,
      },
    })

    // ── Activity log ──────────────────────────────────────────────────────────
    await logActivity(adminUser, "expiry_extended", "account", accountId, {
      new_expiry: newExpiryDate,
      reason:     reason ?? null,
    })

    return NextResponse.json({ success: true, newExpiryDate })
  } catch (err: any) {
    console.error("[extend-expiry] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
