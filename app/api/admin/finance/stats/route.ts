import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { startOfMonth } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // 1. Dodo (Card) Revenue - Sum from public.accounts
    const { data: dodoData, error: dodoError } = await supabaseAdmin
      .from("accounts")
      .select("last_payment_amount, account_id")
      .eq("subscription_status", "active")
      .not("dodo_subscription_id", "is", null)

    if (dodoError) throw dodoError

    const cardRevenue = (dodoData || []).reduce((acc, curr) => acc + (Number(curr.last_payment_amount) || 0), 0)
    const activeSubscribers = dodoData?.length || 0

    // 2. Manual (M-Pesa/Wire) Revenue - Sum from admin.payments (This Month)
    const monthStart = startOfMonth(new Date()).toISOString()
    const { data: manualData, error: manualError } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("payments")
      .select("amount_kes")
      .in("payment_method", ["mpesa", "wire"])
      .eq("status", "confirmed")
      .gte("payment_date", monthStart)

    if (manualError) throw manualError

    const manualRevenue = (manualData || []).reduce((acc, curr) => acc + (Number(curr.amount_kes) || 0), 0)

    // 3. Invoice Stats (Outstanding/Overdue)
    const { data: invoiceData, error: invoiceError } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("invoices")
      .select("amount_kes, status")
      .in("status", ["unpaid", "overdue"])

    if (invoiceError) throw invoiceError

    const outstandingKES = (invoiceData || [])
      .filter(inv => inv.status === 'unpaid' || inv.status === 'overdue')
      .reduce((acc, curr) => acc + (Number(curr.amount_kes) || 0), 0)
    
    const overdueCount = (invoiceData || [])
      .filter(inv => inv.status === 'overdue').length

    // 4. Plan Breakdown
    const { data: planData, error: planError } = await supabaseAdmin
      .from("accounts")
      .select("plan_tier, subscription_status")

    if (planError) throw planError

    const breakdown = (planData || []).reduce((acc: any, curr) => {
      const key = `${curr.plan_tier}:${curr.subscription_status}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      saas: {
        cardRevenue,
        activeSubscribers,
        manualRevenue,
        outstandingKES,
        overdueCount
      },
      breakdown
    })
  } catch (error: any) {
    console.error("[FINANCE_STATS_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

