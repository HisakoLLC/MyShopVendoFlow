import { NextResponse } from "next/server"
import { requireFinance, requireSuperAdmin, adminDb, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params
    const { action, reason } = await req.json()

    if (!["void", "waive"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'void' or 'waive'" },
        { status: 400 }
      )
    }

    // void → super_admin only; waive → finance+
    const authResult =
      action === "void"
        ? await requireSuperAdmin()
        : await requireFinance()

    if (authResult.errorResponse) return authResult.errorResponse
    const { adminUser } = authResult

    // ── Fetch invoice for validation ───────────────────────────────────────────
    const { data: invoice, error: fetchErr } = await (adminDb().from("invoices") as any)
      .select("id, status, invoice_number, account_id")
      .eq("id", invoiceId)
      .single()

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status === "void") {
      return NextResponse.json({ error: "Invoice is already void" }, { status: 422 })
    }

    if (invoice.status === "paid" && action === "void") {
      return NextResponse.json(
        { error: "Cannot void a paid invoice. Waive it instead." },
        { status: 422 }
      )
    }

    const newStatus = action === "void" ? "void" : "waived"

    // ── UPDATE admin.invoices ──────────────────────────────────────────────────
    const { data: updated, error: updateErr } = await (adminDb().from("invoices") as any)
      .update({ status: newStatus })
      .eq("id", invoiceId)
      .select()
      .single()

    if (updateErr) {
      console.error(`[invoices/${invoiceId}] Update failed:`, updateErr)
      return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
    }

    // ── Activity log ───────────────────────────────────────────────────────────
    await logActivity(adminUser, `invoice_${newStatus}`, "invoice", invoiceId, {
      invoice_number: invoice.invoice_number,
      account_id:     invoice.account_id,
      reason:         reason ?? null,
    })

    return NextResponse.json({ invoice: updated })
  } catch (err: any) {
    console.error("[invoices/[invoiceId]] PATCH Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
