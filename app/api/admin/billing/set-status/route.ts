import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireSuperAdmin, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

const STATUS_TO_EVENT: Record<string, string> = {
  active:    "account_reactivated_by_admin",
  suspended: "account_suspended_by_admin",
  cancelled: "account_cancelled_by_admin",
}

const VALID_STATUSES = Object.keys(STATUS_TO_EVENT)

export async function POST(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireSuperAdmin()
    if (errorResponse) return errorResponse

    const { accountId, status, reason } = await req.json()

    if (!accountId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, status" },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      )
    }

    // ── Update public.accounts ────────────────────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from("accounts")
      .update({ subscription_status: status })
      .eq("account_id", accountId)

    if (updateErr) {
      console.error("[set-status] Update failed:", updateErr)
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
    }

    // ── Subscription event ────────────────────────────────────────────────────
    await supabaseAdmin.from("subscription_events").insert({
      account_id: accountId,
      event_type: STATUS_TO_EVENT[status],
      status:     "success",
      event_data: {
        new_status: status,
        reason:     reason ?? null,
        admin:      adminUser.email,
      },
    })

    // ── Activity log ──────────────────────────────────────────────────────────
    await logActivity(adminUser, STATUS_TO_EVENT[status], "account", accountId, {
      new_status: status,
      reason:     reason ?? null,
    })

    return NextResponse.json({ success: true, status })
  } catch (err: any) {
    console.error("[set-status] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
