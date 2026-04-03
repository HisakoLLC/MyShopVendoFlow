import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { data: payments, error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("payments")
      .select(`
        *,
        accounts:account_id (
          business_name
        )
      `)
      .in("payment_method", ["mpesa", "wire", "bank_transfer"])
      .order("payment_date", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ payments })
  } catch (error: any) {
    console.error("[FINANCE_PAYMENTS_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

