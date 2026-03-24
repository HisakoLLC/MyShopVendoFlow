import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .schema("admin" as any)
      .from("finance_transactions")
      .select(`
        *,
        accounts:merchant_id ( business_name )
      `)
      .order("transaction_date", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = await createServerSupabaseClient()
    
    // Auth & Admin Check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: adminUser } = await supabaseAdmin
      .schema("admin" as any)
      .from("admin_users")
      .select("id")
      .eq("email", session.user.email)
      .single()

    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .schema("admin" as any)
      .from("finance_transactions")
      .insert({
        amount: body.amount,
        type: body.type,
        merchant_id: body.merchantId || null,
        transaction_date: body.transactionDate || new Date().toISOString().split("T")[0],
        notes: body.notes || "",
        created_by: adminUser.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
