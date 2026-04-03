import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireAdmin, adminDb, ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    const { accountId } = await params

    // ── Parallel fetches ────────────────────────────────────────────────────
    const [
      accountRes,
      paymentsRes,
      invoicesRes,
      flagsRes,
      eventsRes,
      notesRes,
    ] = await Promise.all([
      // 1. Billing state from public.accounts
      supabaseAdmin
        .from("accounts")
        .select(`
          plan_tier,
          subscription_status,
          dodo_customer_id,
          dodo_subscription_id,
          subscription_current_period_end,
          next_payment_date,
          last_payment_date,
          last_payment_amount,
          subscription_started_at
        `)
        .eq("account_id", accountId)
        .single(),

      // 2. admin.payments (last 20)
      (adminDb().from("payments") as any)
        .select("*")
        .eq("account_id", accountId)
        .order("payment_date", { ascending: false })
        .limit(20),

      // 3. admin.invoices
      (adminDb().from("invoices") as any)
        .select("*")
        .eq("account_id", accountId)
        .order("due_date", { ascending: false }),

      // 4. admin.account_flags
      (adminDb().from("account_flags") as any)
        .select("*")
        .eq("account_id", accountId),

      // 5. public.subscription_events (last 10)
      supabaseAdmin
        .from("subscription_events")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(10),

      // 6. admin.account_notes
      (adminDb().from("account_notes") as any)
        .select("*")
        .eq("account_id", accountId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false }),
    ])

    if (accountRes.error || !accountRes.data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const account  = accountRes.data
    const payments = paymentsRes.data  ?? []
    const invoices = invoicesRes.data  ?? []
    const flags    = flagsRes.data     ?? []
    const events   = eventsRes.data    ?? []
    const notes    = notesRes.data     ?? []

    // ── Computed summary ────────────────────────────────────────────────────
    const periodEnd = account.subscription_current_period_end
    const daysRemaining = periodEnd
      ? Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 86_400_000)
      : null

    const confirmedPayments = (payments as any[]).filter(
      (p) => p.status === "confirmed"
    )
    const totalPaidKes = confirmedPayments.reduce(
      (s, p) => s + (p.amount_kes ?? 0), 0
    )
    const totalPaidUsd = confirmedPayments.reduce(
      (s, p) => s + (p.amount_usd ?? 0), 0
    )

    const unpaidInvoices = (invoices as any[]).filter((inv) =>
      ["unpaid", "overdue"].includes(inv.status)
    )
    const outstandingKes = unpaidInvoices.reduce(
      (s, inv) => s + (inv.amount_kes ?? 0), 0
    )
    const overdueCount = (invoices as any[]).filter(
      (inv) => inv.status === "overdue"
    ).length

    return NextResponse.json({
      account,
      payments,
      invoices,
      flags,
      notes,
      subscription_events: events,
      summary: {
        days_remaining:   daysRemaining,
        total_paid_kes:   Number(totalPaidKes.toFixed(2)),
        total_paid_usd:   Number(totalPaidUsd.toFixed(2)),
        outstanding_kes:  Number(outstandingKes.toFixed(2)),
        overdue_count:    overdueCount,
      },
    })
  } catch (err: any) {
    console.error("[billing/[accountId]] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
