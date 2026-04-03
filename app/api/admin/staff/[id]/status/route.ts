import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { is_active } = await req.json()
    const supabase = await createServerSupabaseClient()
    
    // Auth & Permission Check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: currentUser } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("admin_users")
      .select("id, role")
      .eq("email", session.user.email)
      .single()

    if (!currentUser || currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Prevent self-deactivation
    if (id === currentUser.id && is_active === false) {
      return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("admin_users")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error

    // If deactivating, we might want to also revoke active sessions for this user in Auth
    // This is optional but recommended
    // if (!is_active) await supabaseAdmin.auth.admin.signOut(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
