import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // 1. Overdue Invoice count
    const { count: overdueInvoicesCount, error: invoiceError } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("status", "overdue")

    if (invoiceError) throw invoiceError

    // 2. At-Risk Merchant count
    const { count: atRiskMerchantsCount, error: flagError } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("account_flags")
      .select("*", { count: "exact", head: true })
      .eq("flag_type", "at_risk")

    if (flagError) throw flagError

    return NextResponse.json({
      overdueInvoicesCount: overdueInvoicesCount || 0,
      atRiskMerchantsCount: atRiskMerchantsCount || 0
    })
  } catch (error: any) {
    console.error("[NAV_BADGES_GET] Full Error:", error)
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: error.message || error.details || JSON.stringify(error) 
    }, { status: 500 })
  }
}

