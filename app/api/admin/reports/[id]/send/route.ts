import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { distributeReportToConversations } from "@/lib/admin/reports"
import { PERMISSIONS, hasPermission } from "@/lib/admin/permissions"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { recipientConversationIds } = await req.json()
    const supabase = await createServerSupabaseClient()
    
    // 1. Auth & Admin Check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: adminUser } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("admin_users")
      .select("id, is_active, role")
      .eq("email", session.user.email)
      .single()

    if (!adminUser || !adminUser.is_active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 1b. Verify Role-Based Permission
    if (!hasPermission(adminUser.role, 'reports_send')) {
      return NextResponse.json({ 
        error: "Permission Denied", 
        detail: `Role '${adminUser.role}' is not authorized to send reports.` 
      }, { status: 403 })
    }

    // 2. Execute Batch Distribution via shared service
    const baseUrl = new URL(req.url).origin
    const result = await distributeReportToConversations(
      id,
      "", // merchantId (not needed for this call)
      recipientConversationIds,
      baseUrl
    )

    return NextResponse.json(result)

  } catch (error: any) {
    console.error("Manual Batch Send Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
