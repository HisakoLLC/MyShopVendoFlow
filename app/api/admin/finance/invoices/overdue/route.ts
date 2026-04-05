import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { data: rawInvoices, error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("invoices")
      .select("*")
      .eq("status", "overdue")
      .order("due_date", { ascending: true })

    if (error) throw error

    // Fetch account details manually to bypass cross-schema PostgREST limitations
    const accountIds = Array.from(new Set((rawInvoices || []).map(inv => inv.account_id).filter(Boolean)))
    let accountsMap: Record<string, any> = {}
    
    if (accountIds.length > 0) {
      const { data: accountsData } = await supabaseAdmin
        .from("accounts")
        .select("account_id, business_name")
        .in("account_id", accountIds)
        
      if (accountsData) {
        accountsMap = accountsData.reduce((acc: any, curr: any) => {
          acc[curr.account_id] = { business_name: curr.business_name }
          return acc
        }, {} as Record<string, any>)
      }
    }

    const overdueInvoices = (rawInvoices || []).map(inv => ({
      ...inv,
      accounts: inv.account_id ? accountsMap[inv.account_id] : null
    }))

    return NextResponse.json({ overdueInvoices })
  } catch (error: any) {
    console.error("[FINANCE_INVOICES_OVERDUE_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

