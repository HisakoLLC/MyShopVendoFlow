import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const merchantId = searchParams.get("merchantId")
    
    const supabase = await createServerSupabaseClient()
    
    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // 2. Fetch Conversations
    let query = supabaseAdmin
      .schema("admin" as any)
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
