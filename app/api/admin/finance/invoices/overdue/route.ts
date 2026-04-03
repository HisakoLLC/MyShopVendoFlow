import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { data: overdueInvoices, error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("invoices")
      .select(`
        *,
        accounts:account_id (
          business_name
        )
      `)
      .eq("status", "overdue")
      .order("due_date", { ascending: true })

    if (error) throw error

    return NextResponse.json({ overdueInvoices })
  } catch (error: any) {
    console.error("[FINANCE_INVOICES_OVERDUE_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

