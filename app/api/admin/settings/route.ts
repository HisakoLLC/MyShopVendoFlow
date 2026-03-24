import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { PERMISSIONS, hasPermission } from "@/lib/admin/permissions"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .schema("admin" as any)
      .from("settings")
      .select("*")

    if (error) throw error

    // Transform to key-value map for easier client use
    const settings = data.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value
      return acc
    }, {})

    return NextResponse.json(settings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { key, value } = await req.json()
    const supabase = await createServerSupabaseClient()
    
    // Auth & Permission Check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: adminUser } = await supabaseAdmin
      .schema("admin" as any)
      .from("admin_users")
      .select("id, role")
      .eq("email", session.user.email)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden: Admin context not found" }, { status: 403 })
    }

    // 1b. Verify Role-Based Permission
    // settings_manage is restricted to super_admin in PERMISSIONS map
    if (!hasPermission(adminUser.role, 'settings_manage')) {
      return NextResponse.json({ 
        error: "Permission Denied", 
        detail: `Role '${adminUser.role}' is not authorized to modify system settings.` 
      }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .schema("admin" as any)
      .from("settings")
      .upsert({ 
        key, 
        value, 
        updated_by: adminUser.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
