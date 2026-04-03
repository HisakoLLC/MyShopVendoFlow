import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireFinance, adminDb, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireFinance()
    if (errorResponse) return errorResponse

    const body = await req.json()
    const {
      accountId,
      amountKes,
      amountUsd,
      paymentMethod,
      mpesaCode,
      mpesaPhone,
      wireReference,
      paymentDate,
      periodStart,
      periodEnd,
      invoiceId,
      extendSubscription,
      notes,
    } = body

    // ── Validation ───────────────────────────────────────────────────────────
    if (!accountId || !paymentMethod || !paymentDate || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, paymentMethod, paymentDate, periodStart, periodEnd" },
        { status: 400 }
      )
    }

    if (amountKes == null && amountUsd == null) {
      return NextResponse.json(
        { error: "Either amountKes or amountUsd is required" },
        { status: 400 }
      )
    }

    if (paymentMethod === "mpesa" && !mpesaCode) {
      return NextResponse.json(
        { error: "mpesaCode is required when paymentMethod is 'mpesa'" },
        { status: 400 }
      )
    }

    // ── 1. INSERT into admin.payments ────────────────────────────────────────
    const { data: payment, error: payErr } = await (adminDb().from("payments") as any)
      .insert({
        account_id:     accountId,
        amount_kes:     amountKes   ?? null,
        amount_usd:     amountUsd   ?? null,
        payment_method: paymentMethod,
        mpesa_code:     mpesaCode   ?? null,
        mpesa_phone:    mpesaPhone  ?? null,
        wire_reference: wireReference ?? null,
        status:         "confirmed",
        source:         "manual",
        payment_date:   paymentDate,
        period_start:   periodStart,
        period_end:     periodEnd,
        notes:          notes ?? null,
        recorded_by:    adminUser.id,
      })
      .select()
      .single()

    if (payErr) {
      console.error("[record-payment] Insert failed:", payErr)
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
    }

    // ── 2. Mark invoice paid (optional) ──────────────────────────────────────
    if (invoiceId) {
      await (adminDb().from("invoices") as any)
        .update({
          status:     "paid",
          paid_at:    new Date().toISOString(),
          payment_id: payment.id,
        })
        .eq("id", invoiceId)
    }

    // ── 3. Extend subscription on public.accounts (optional) ─────────────────
    if (extendSubscription) {
      await supabaseAdmin
        .from("accounts")
        .update({
          subscription_status:             "active",
          subscription_current_period_end: periodEnd,
          next_payment_date:               periodEnd,
          last_payment_date:               paymentDate,
          last_payment_amount:             amountKes ?? amountUsd,
        })
        .eq("account_id", accountId)
    }

    // ── 4. Subscription event audit ───────────────────────────────────────────
    const currency   = amountKes != null ? "KES" : "USD"
    const amount     = amountKes ?? amountUsd
    const reference  = mpesaCode ?? wireReference ?? null

    await supabaseAdmin.from("subscription_events").insert({
      account_id:  accountId,
      event_type:  "payment_recorded_manually",
      amount,
      currency,
      status:      "success",
      event_data:  {
        admin:   adminUser.email,
        method:  paymentMethod,
        reference,
        payment_id: payment.id,
      },
    })

    // ── 5. Activity log ───────────────────────────────────────────────────────
    await logActivity(adminUser, "payment_recorded", "account", accountId, {
      payment_id:     payment.id,
      amount,
      currency,
      payment_method: paymentMethod,
      invoice_id:     invoiceId ?? null,
      extend:         !!extendSubscription,
    })

    return NextResponse.json({ payment }, { status: 201 })
  } catch (err: any) {
    console.error("[record-payment] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
