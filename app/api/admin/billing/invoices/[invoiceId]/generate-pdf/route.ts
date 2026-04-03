import { NextResponse } from "next/server"
import { getServerAdminUser } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { generateInvoicePdf, type InvoiceData } from "@/lib/admin/generateInvoicePdf"

export const dynamic = "force-dynamic"

// Helper: format a Date or ISO string as "Jan 1, 2025"
function fmt(val: string | Date | null | undefined): string {
  if (!val) return "—"
  return new Date(val).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    // ── 1. Auth ─────────────────────────────────────────────────────────────
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { invoiceId } = await params

    // ── 2. Fetch invoice + merchant ──────────────────────────────────────────
    // Invoice lives in admin schema; merchant data in public.accounts.
    const { data: invoice, error: invErr } = await (supabaseAdmin
      .schema("admin" as any)
      .from("invoices") as any)
      .select(
        `id, invoice_number, amount_usd, amount_kes, status, due_date,
         paid_at, period_start, period_end, notes,
         account_id`
      )
      .eq("id", invoiceId)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status === "void") {
      return NextResponse.json({ error: "Cannot generate PDF for a void invoice" }, { status: 422 })
    }

    // Fetch merchant from public.accounts using account_id
    const { data: merchant, error: merchantErr } = await supabaseAdmin
      .from("accounts")
      .select("business_name, owner_email, plan_tier")
      .eq("account_id", invoice.account_id)
      .single()

    if (merchantErr || !merchant) {
      return NextResponse.json({ error: "Merchant account not found" }, { status: 404 })
    }

    // ── 3. Generate PDF ──────────────────────────────────────────────────────
    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoice_number,
      merchantName:  merchant.business_name ?? "Unknown Business",
      merchantEmail: merchant.owner_email   ?? "",
      planTier:      merchant.plan_tier     ?? "starter",
      billingCycle:  "Monthly",
      periodStart:   fmt(invoice.period_start),
      periodEnd:     fmt(invoice.period_end),
      amountUsd:     invoice.amount_usd ?? undefined,
      amountKes:     invoice.amount_kes ?? undefined,
      dueDate:       fmt(invoice.due_date),
      isPaid:        invoice.status === "paid",
      paidAt:        invoice.paid_at ? fmt(invoice.paid_at) : undefined,
      notes:         invoice.notes  ?? undefined,
    }

    const pdfBytes = generateInvoicePdf(invoiceData)

    // ── 4. Upload to Supabase Storage ────────────────────────────────────────
    const filename = `${invoice.invoice_number}.pdf`

    // Create bucket if it doesn't exist (idempotent)
    await supabaseAdmin.storage.createBucket("invoices", {
      public: false,
      allowedMimeTypes: ["application/pdf"],
    })

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("invoices")
      .upload(filename, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadErr) {
      console.error("[generate-pdf] Storage upload failed:", uploadErr)
      return NextResponse.json(
        { error: "Failed to upload PDF to storage" },
        { status: 500 }
      )
    }

    // ── 5. Create 24-hour signed URL ─────────────────────────────────────────
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("invoices")
      .createSignedUrl(filename, 86400)

    if (signErr || !signed?.signedUrl) {
      console.error("[generate-pdf] Signed URL creation failed:", signErr)
      return NextResponse.json(
        { error: "Failed to create signed URL" },
        { status: 500 }
      )
    }

    const pdfUrl = signed.signedUrl

    // ── 6. Update admin.invoices ─────────────────────────────────────────────
    await (supabaseAdmin
      .schema("admin" as any)
      .from("invoices") as any)
      .update({
        pdf_url:          pdfUrl,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)

    // ── 7. Return ────────────────────────────────────────────────────────────
    return NextResponse.json({
      pdfUrl,
      invoiceNumber: invoice.invoice_number,
    })
  } catch (err: any) {
    console.error("[generate-pdf] Unexpected error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
