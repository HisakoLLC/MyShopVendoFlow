import { NextResponse } from "next/server"
import { getServerAdminUser } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const merchantId = searchParams.get("merchantId")
    
    // 1. Verify custom Admin Session
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized: Admin access only" }, { status: 401 })
    }

    // 2. Fetch Conversations
    let query = supabaseAdmin
      .schema("vendo_admin" as any)
      .from("whatsapp_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })

    if (merchantId) {
      query = query.eq("merchant_id", merchantId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)

  } catch (error: any) {
    console.error("Fetch Conversations Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
