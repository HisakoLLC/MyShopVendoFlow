import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export async function GET() {
  try {
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
