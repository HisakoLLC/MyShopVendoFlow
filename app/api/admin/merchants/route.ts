import { NextResponse } from "next/server"
import { getServerAdminUser } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export async function GET() {
  try {
    // 1. Verify custom Admin Session
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized: Admin access only" }, { status: 401 })
    }
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("id:account_id, name:business_name")
      .order("business_name", { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching merchants for admin:", error)
    return NextResponse.json({ error: "Failed to fetch merchants" }, { status: 500 })
  }
}
