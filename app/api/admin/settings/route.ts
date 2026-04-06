import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { PERMISSIONS, hasPermission } from "@/lib/admin/permissions"
import { getServerAdminUser } from "@/lib/admin/auth"

export async function GET() {
  try {
    // Auth check
    const adminUser = await getServerAdminUser()
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
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
    const adminUser = await getServerAdminUser()
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
      .schema(ADMIN_SCHEMA as any)
      .from("settings")
      .upsert({ 
        key, 
        value, 
        updated_by: adminUser.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select()
      .single()

    if (error) {
      console.error("[Settings] UPSERT error:", error)
      
      // Fallback in case Supabase bug occurs with default UUID generation during upsert
      if (error.code === '23502') { // Not null violation
         console.warn("[Settings] Falling back to traditional query matching")
         
         // Try checking if it exists first
         const { data: existing } = await supabaseAdmin.schema(ADMIN_SCHEMA as any).from("settings").select("id").eq("key", key).maybeSingle()
         
         if (existing) {
             const { error: updErr, data: updData } = await supabaseAdmin.schema(ADMIN_SCHEMA as any).from("settings").update({ value, updated_by: adminUser.id, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single()
             if (updErr) throw updErr
             return NextResponse.json(updData)
         } else {
             const { error: insErr, data: insData } = await supabaseAdmin.schema(ADMIN_SCHEMA as any).from("settings").insert({ key, value, updated_by: adminUser.id, updated_at: new Date().toISOString() }).select().single()
             if (insErr) throw insErr
             return NextResponse.json(insData)
         }
      }
      
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[API][Settings] Final Catch Error:", error)
    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 })
  }
}

