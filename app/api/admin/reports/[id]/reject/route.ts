import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { PERMISSIONS, hasPermission } from "@/lib/admin/permissions"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { rejectionNote } = await req.json()
    const supabase = await createServerSupabaseClient()
    
    // 1. Auth & Admin Check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: adminUser } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("admin_users")
      .select("id, role, is_active")
      .eq("email", session.user.email)
      .single()

    if (!adminUser || !adminUser.is_active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 1b. Verify Role-Based Permission
    if (!hasPermission(adminUser.role, 'reports_approve')) {
      return NextResponse.json({ 
        error: "Permission Denied", 
        detail: `Role '${adminUser.role}' is not authorized to reject reports.` 
      }, { status: 403 })
    }

    // 2. Reject Report
    const { error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("reports")
      .update({
        status: "rejected",
        rejection_note: rejectionNote
      })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
