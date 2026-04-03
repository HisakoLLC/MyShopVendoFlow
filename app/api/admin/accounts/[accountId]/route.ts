import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireAdmin, requireSuperAdmin, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

// ── PATCH /api/admin/accounts/[accountId] ────────────────────────────────────
// Body: { name?, email?, phone?, city?, country? }
// email updates require super_admin; everything else requires any admin role.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const body = await req.json()
    const { name, email, phone, city, country } = body

    // Determine required auth level: any admin for basic fields, super_admin for email
    if (email !== undefined) {
      const { errorResponse } = await requireSuperAdmin()
      if (errorResponse) return errorResponse
    }
    const { adminUser, errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    if (!name && !email && phone === undefined && city === undefined && country === undefined) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 })
    }

    // ── Track changes for audit ───────────────────────────────────────────────
    const changes: Record<string, unknown> = {}

    // ── Update public.accounts (business_name, city, country) ─────────────────
    const accountUpdate: Record<string, unknown> = {}
    if (name !== undefined) {
      accountUpdate.business_name = name.trim()
      changes.name = name.trim()
    }
    if (city !== undefined) {
      accountUpdate.city = city?.trim() || null
      changes.city = city?.trim() || null
    }
    if (country !== undefined) {
      accountUpdate.country = country?.trim() || null
      changes.country = country?.trim() || null
    }

    if (Object.keys(accountUpdate).length > 0) {
      const { error: accErr } = await supabaseAdmin
        .from("accounts")
        .update(accountUpdate)
        .eq("account_id", accountId)

      if (accErr) {
        console.error("[accounts PATCH] accounts update failed:", accErr)
        return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
      }
    }

    // ── Update public.staff (phone and/or email for the owner) ────────────────
    let ownerId: string | null = null

    if (phone !== undefined || email !== undefined) {
      // Find the owner staff record first
      const { data: ownerStaff, error: ownerErr } = await supabaseAdmin
        .from("staff")
        .select("staff_id, auth_user_id, email")
        .eq("account_id", accountId)
        .eq("role", "owner")
        .eq("active", true)
        .limit(1)
        .single()

      if (ownerErr || !ownerStaff) {
        return NextResponse.json({ error: "Owner staff record not found" }, { status: 404 })
      }

      ownerId = ownerStaff.staff_id

      const staffUpdate: Record<string, unknown> = {}
      if (phone !== undefined) {
        staffUpdate.phone = phone?.trim() || null
        changes.phone = phone?.trim() || null
      }
      if (email !== undefined) {
        // Check email uniqueness across all staff
        const { data: existing } = await supabaseAdmin
          .from("staff")
          .select("staff_id")
          .eq("email", email.trim())
          .neq("staff_id", ownerStaff.staff_id)
          .limit(1)
          .maybeSingle()

        if (existing) {
          return NextResponse.json({ error: "Email is already in use by another account" }, { status: 409 })
        }

        staffUpdate.email = email.trim()
        changes.email = email.trim()

        // Update Supabase Auth email (super_admin guard already applied above)
        if (ownerStaff.auth_user_id) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
            ownerStaff.auth_user_id,
            { email: email.trim() }
          )
          if (authErr) {
            console.error("[accounts PATCH] Auth email update failed:", authErr)
            return NextResponse.json(
              { error: `Failed to update auth email: ${authErr.message}` },
              { status: 500 }
            )
          }
        }

        // Also update owner_email on public.accounts
        await supabaseAdmin
          .from("accounts")
          .update({ owner_email: email.trim() })
          .eq("account_id", accountId)
      }

      if (Object.keys(staffUpdate).length > 0) {
        const { error: staffErr } = await supabaseAdmin
          .from("staff")
          .update(staffUpdate)
          .eq("staff_id", ownerStaff.staff_id)

        if (staffErr) {
          console.error("[accounts PATCH] staff update failed:", staffErr)
          return NextResponse.json({ error: "Failed to update staff record" }, { status: 500 })
        }
      }
    }

    // ── Activity log ───────────────────────────────────────────────────────────
    await logActivity(adminUser, "account_updated", "account", accountId, { changes })

    return NextResponse.json({ success: true, updated: changes })
  } catch (err: any) {
    console.error("[accounts PATCH] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
