import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireSuperAdmin, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireSuperAdmin()
    if (errorResponse) return errorResponse

    const { accountId } = await req.json()

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 })
    }

    // ── Find the owner email ──────────────────────────────────────────────────
    const { data: ownerStaff, error: ownerErr } = await supabaseAdmin
      .from("staff")
      .select("email, staff_id")
      .eq("account_id", accountId)
      .eq("role", "owner")
      .eq("active", true)
      .limit(1)
      .single()

    if (ownerErr || !ownerStaff?.email) {
      return NextResponse.json(
        { error: "No active owner found for this account" },
        { status: 404 }
      )
    }

    const ownerEmail = ownerStaff.email

    // ── Trigger Supabase password reset email ─────────────────────────────────
    // Supabase emails the reset link automatically — we do NOT return it here.
    const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(ownerEmail)

    if (resetErr) {
      console.error("[reset-password] Supabase reset failed:", resetErr)
      return NextResponse.json(
        { error: `Failed to send password reset: ${resetErr.message}` },
        { status: 500 }
      )
    }

    // ── Activity log ──────────────────────────────────────────────────────────
    await logActivity(adminUser, "password_reset_triggered", "account", accountId, {
      owner_email:     ownerEmail,
      triggered_by:    adminUser.email,
    })

    return NextResponse.json({
      message: `Password reset email sent to ${ownerEmail}`,
    })
  } catch (err: any) {
    console.error("[reset-password] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
