import { NextResponse } from "next/server"
import { requireFinance, adminDb, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireFinance()
    if (errorResponse) return errorResponse

    const { accountId, amountKes, amountUsd, dueDate, periodStart, periodEnd, notes } =
      await req.json()

    if (!accountId || !dueDate || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, dueDate, periodStart, periodEnd" },
        { status: 400 }
      )
    }

    if (amountKes == null && amountUsd == null) {
      return NextResponse.json(
        { error: "Either amountKes or amountUsd is required" },
        { status: 400 }
      )
    }

    // ── Generate invoice number via DB function ────────────────────────────────
    const { data: numData, error: numErr } = await (adminDb().rpc as any)(
      "generate_invoice_number"
    )

    if (numErr || !numData) {
      console.error("[create-invoice] generate_invoice_number failed:", numErr)
      return NextResponse.json(
        { error: "Failed to generate invoice number" },
        { status: 500 }
      )
    }

    const invoiceNumber: string = numData

    // ── INSERT into admin.invoices ─────────────────────────────────────────────
    const { data: invoice, error: invErr } = await (adminDb().from("invoices") as any)
      .insert({
        account_id:     accountId,
        invoice_number: invoiceNumber,
        amount_kes:     amountKes  ?? null,
        amount_usd:     amountUsd  ?? null,
        status:         "unpaid",
        due_date:       dueDate,
        period_start:   periodStart,
        period_end:     periodEnd,
        notes:          notes ?? null,
        created_by:     adminUser.id,
      })
      .select()
      .single()

    if (invErr) {
      console.error("[create-invoice] Insert failed:", invErr)
      return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
    }

    // ── Activity log ───────────────────────────────────────────────────────────
    await logActivity(adminUser, "invoice_created", "invoice", invoice.id, {
      invoice_number: invoiceNumber,
      account_id:     accountId,
      amount_kes:     amountKes ?? null,
      amount_usd:     amountUsd ?? null,
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err: any) {
    console.error("[create-invoice] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
