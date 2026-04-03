import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { PERMISSIONS, hasPermission } from "@/lib/admin/permissions"

export async function POST(req: Request) {
  try {
    const { fullName, email, role } = await req.json()
    const supabase = await createServerSupabaseClient()
    
    // 1. Auth & Super Admin Check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: currentUser } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("admin_users")
      .select("role")
      .eq("email", session.user.email)
      .single()

    if (!currentUser) {
      return NextResponse.json({ error: "Forbidden: Admin context not found" }, { status: 403 })
    }

    // 1b. Verify Role-Based Permission
    if (!hasPermission(currentUser.role, 'staff_manage')) {
      return NextResponse.json({ 
        error: "Permission Denied", 
        detail: `Role '${currentUser.role}' is not authorized to manage staff accounts.` 
      }, { status: 403 })
    }

    // 2. Create Auth User (System Account)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, is_admin: true }
    })

    if (authError) throw authError

    // 3. Create Admin User Record
    const { error: dbError } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("admin_users")
      .insert({
        id: authUser.user.id,
        email,
        full_name: fullName,
        role,
        is_active: true
      })

    if (dbError) {
       // Cleanup auth user if DB insert fails
       await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
       throw dbError
    }

    // 4. Send Invite (Magic Link or Reset Password)
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${new URL(req.url).origin}/admin/login` }
    })

    return NextResponse.json({ success: true, userId: authUser.user.id })

  } catch (error: any) {
    console.error("Invite Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

