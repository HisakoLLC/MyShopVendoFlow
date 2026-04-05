import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { data: rawPayments, error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("payments")
      .select("*")
      .in("payment_method", ["mpesa", "wire", "bank_transfer"])
      .order("payment_date", { ascending: false })
      .limit(50)

    if (error) throw error

    // Fetch account details manually to bypass cross-schema PostgREST limitations
    const accountIds = Array.from(new Set((rawPayments || []).map(p => p.account_id).filter(Boolean)))
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

    const payments = (rawPayments || []).map(p => ({
      ...p,
      accounts: p.account_id ? accountsMap[p.account_id] : null
    }))

    return NextResponse.json({ payments })
  } catch (error: any) {
    console.error("[FINANCE_PAYMENTS_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

