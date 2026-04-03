import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireFinance, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireFinance()
    if (errorResponse) return errorResponse

    const { accountId, planTier, newPeriodEnd, reason } = await req.json()

    if (!accountId || !planTier || !newPeriodEnd) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, planTier, newPeriodEnd" },
        { status: 400 }
      )
    }

    const validPlans = ["starter", "core", "scale", "trial"]
    if (!validPlans.includes(planTier)) {
      return NextResponse.json(
        { error: `Invalid planTier. Must be one of: ${validPlans.join(", ")}` },
        { status: 400 }
      )
    }

    // ── 1. Get current plan for audit ─────────────────────────────────────────
    const { data: current } = await supabaseAdmin
      .from("accounts")
      .select("plan_tier")
      .eq("account_id", accountId)
      .single()

    const oldPlan = current?.plan_tier ?? "unknown"

    // ── 2. Update public.accounts ─────────────────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from("accounts")
      .update({
        plan_tier:                       planTier,
        subscription_status:             planTier === "trial" ? "trial" : "active",
        subscription_current_period_end: newPeriodEnd,
        next_payment_date:               newPeriodEnd,
      })
      .eq("account_id", accountId)

    if (updateErr) {
      console.error("[set-plan] Update failed:", updateErr)
      return NextResponse.json({ error: "Failed to update plan" }, { status: 500 })
    }

    // ── 3. Subscription event ─────────────────────────────────────────────────
    await supabaseAdmin.from("subscription_events").insert({
      account_id: accountId,
      event_type: "plan_changed_by_admin",
      status:     "success",
      event_data: {
        from:       oldPlan,
        to:         planTier,
        reason:     reason ?? null,
        admin:      adminUser.email,
        period_end: newPeriodEnd,
      },
    })

    // ── 4. Activity log ───────────────────────────────────────────────────────
    await logActivity(adminUser, "plan_changed", "account", accountId, {
      from:       oldPlan,
      to:         planTier,
      period_end: newPeriodEnd,
      reason:     reason ?? null,
    })

    return NextResponse.json({ success: true, from: oldPlan, to: planTier })
  } catch (err: any) {
    console.error("[set-plan] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
