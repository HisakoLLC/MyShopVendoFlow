import { NextResponse } from "next/server"
import { requireAdmin, adminDb, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

// ── POST /api/admin/accounts/[accountId]/flags ───────────────────────────────
// Body: { flag_type, label, color?, notes? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { adminUser, errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    const { accountId } = await params
    const { flag_type, label, color, notes } = await req.json()

    if (!flag_type || !label) {
      return NextResponse.json(
        { error: "Missing required fields: flag_type, label" },
        { status: 400 }
      )
    }

    const validTypes = ["vip", "at_risk", "churned", "trial_convert", "support_issue", "custom"]
    if (!validTypes.includes(flag_type)) {
      return NextResponse.json(
        { error: `Invalid flag_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const { data: flag, error: insertErr } = await (adminDb().from("account_flags") as any)
      .insert({
        account_id:  accountId,
        flag_type,
        label,
        color:       color ?? "zinc",
        notes:       notes ?? null,
        created_by:  adminUser.id,
      })
      .select()
      .single()

    if (insertErr) {
      console.error("[flags POST] Insert failed:", insertErr)
      return NextResponse.json({ error: "Failed to create flag" }, { status: 500 })
    }

    await logActivity(adminUser, "flag_added", "account", accountId, {
      flag_id:   flag.id,
      flag_type,
      label,
    })

    return NextResponse.json({ flag }, { status: 201 })
  } catch (err: any) {
    console.error("[flags POST] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}

// ── DELETE /api/admin/accounts/[accountId]/flags ──────────────────────────────
// Query: ?flagId=<uuid>
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { adminUser, errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    const { accountId } = await params
    const flagId = new URL(req.url).searchParams.get("flagId")

    if (!flagId) {
      return NextResponse.json({ error: "Missing flagId query param" }, { status: 400 })
    }

    const { error: deleteErr } = await (adminDb().from("account_flags") as any)
      .delete()
      .eq("id", flagId)
      .eq("account_id", accountId) // ownership check

    if (deleteErr) {
      console.error("[flags DELETE] Failed:", deleteErr)
      return NextResponse.json({ error: "Failed to delete flag" }, { status: 500 })
    }

    await logActivity(adminUser, "flag_removed", "account", accountId, { flag_id: flagId })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[flags DELETE] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
