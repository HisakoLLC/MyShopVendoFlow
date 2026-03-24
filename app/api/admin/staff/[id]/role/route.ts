import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { role } = await req.json()
    const supabase = await createServerSupabaseClient()
    
    // Auth & Permission Check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: currentUser } = await supabaseAdmin
      .schema("admin" as any)
      .from("admin_users")
      .select("role")
      .eq("email", session.user.email)
      .single()

    if (!currentUser || currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .schema("admin" as any)
      .from("admin_users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
