import { adminDb } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // 1. Overdue Invoice count
    const { count: overdueInvoicesCount, error: invoiceError } = await adminDb()
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("status", "overdue")

    if (invoiceError) {
      console.error("[NAV_BADGES_GET] Invoices Error:", invoiceError)
      throw invoiceError
    }

    // 2. At-Risk Merchant count
    const { count: atRiskMerchantsCount, error: flagError } = await adminDb()
      .from("account_flags")
      .select("*", { count: "exact", head: true })
      .eq("flag_type", "at_risk")

    if (flagError) {
      console.error("[NAV_BADGES_GET] Flags Error:", flagError)
      throw flagError
    }

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

