import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"

export async function GET(req: Request) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .schema("admin" as any)
      .from("admin_users")
      .select("id, full_name, role, avatar_url")
      .eq("is_active", true)

    if (error) {
      console.error("[ADMIN_USERS_GET_ERROR]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: data })
  } catch (error: any) {
    console.error("[ADMIN_USERS_GET_CRASH]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
