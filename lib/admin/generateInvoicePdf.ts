import { jsPDF } from "jspdf"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceData {
  invoiceNumber: string
  merchantName: string
  merchantEmail: string
  planTier: string
  billingCycle: string
  periodStart: string  // pre-formatted: "Jan 1, 2025"
  periodEnd: string    // pre-formatted: "Jan 31, 2025"
  amountUsd?: number
  amountKes?: number
  dueDate: string      // pre-formatted
  isPaid: boolean
  paidAt?: string      // pre-formatted, optional
  notes?: string
}

// ---------------------------------------------------------------------------
// Main generator — pure function, no network calls
// Returns raw bytes suitable for Supabase Storage upload or Response body
// ---------------------------------------------------------------------------

export function generateInvoicePdf(data: InvoiceData): Uint8Array {
  // Payment details from env (safe to read at call-time — server only)
  const mpesaPaybill  = process.env.INVOICE_MPESA_PAYBILL  ?? ""
  const bankName      = process.env.INVOICE_BANK_NAME       ?? ""
  const bankAccount   = process.env.INVOICE_BANK_ACCOUNT    ?? ""

  // ── Doc setup ─────────────────────────────────────────────────────────────
  const doc = new jsPDF({ format: "a4", unit: "mm" })
  const pageWidth  = doc.internal.pageSize.getWidth()  // 210
  const margin     = 20
  const contentW   = pageWidth - margin * 2            // 170
  let y            = margin

  // ── Helpers (same pattern as PO PDF) ──────────────────────────────────────
  const gap = (n: number) => { y += n }

  const rule = (thickness = 0.2) => {
    doc.setLineWidth(thickness)
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, pageWidth - margin, y)
    gap(5)
  }

  const labelValue = (label: string, value: string, lx: number, vx: number, ly: number) => {
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(140, 140, 140)
    doc.text(label.toUpperCase(), lx, ly)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(30, 30, 30)
    doc.text(value || "—", vx, ly + 4)
  }

  // ── SECTION 1: HEADER ─────────────────────────────────────────────────────
  // Left: brand
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(10, 10, 10)
  doc.text("VendoFlow", margin, y)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(140, 140, 140)
  doc.text("support@vendoflow.com", margin, y + 5)

  // Right: INVOICE label + number + due date
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(10, 10, 10)
  doc.text("INVOICE", pageWidth - margin, y, { align: "right" })

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  doc.text(`#${data.invoiceNumber}`, pageWidth - margin, y + 8, { align: "right" })
  doc.text(`Due: ${data.dueDate}`, pageWidth - margin, y + 13, { align: "right" })

  gap(22)

  // ── SECTION 2: STATUS BADGE ───────────────────────────────────────────────
  const badgeW  = 28
  const badgeH  = 8
  const badgeX  = margin

  if (data.isPaid) {
    // Green filled badge
    doc.setFillColor(22, 163, 74)
    doc.roundedRect(badgeX, y - 5.5, badgeW, badgeH, 2, 2, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255)
    doc.text("PAID", badgeX + badgeW / 2, y - 0.5, { align: "center" })
    if (data.paidAt) {
      doc.setFontSize(7.5)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(`Paid on ${data.paidAt}`, badgeX + badgeW + 3, y - 0.5)
    }
  } else {
    // Amber filled badge
    doc.setFillColor(217, 119, 6)
    doc.roundedRect(badgeX, y - 5.5, badgeW, badgeH, 2, 2, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255)
    doc.text("UNPAID", badgeX + badgeW / 2, y - 0.5, { align: "center" })
  }

  gap(8)
  rule(0.3)

  // ── SECTION 3: BILL TO + SUBSCRIPTION DETAILS (two columns) ──────────────
  const col1x = margin
  const col2x = margin + contentW * 0.52
  const startY = y

  // Left: Bill To
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(140, 140, 140)
  doc.text("BILL TO", col1x, y)
  gap(5)

  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(10, 10, 10)
  doc.text(data.merchantName, col1x, y)
  gap(5)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(80, 80, 80)
  doc.text(data.merchantEmail, col1x, y)
  gap(4)

  const leftEndY = y

  // Right: Subscription details
  y = startY
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(140, 140, 140)
  doc.text("SUBSCRIPTION DETAILS", col2x, y)
  gap(6)

  const rowGap = 8
  const valX   = col2x + 28

  labelValue("Plan",         data.planTier,     col2x, valX, y); gap(rowGap)
  labelValue("Cycle",        data.billingCycle, col2x, valX, y); gap(rowGap)
  labelValue("Period Start", data.periodStart,  col2x, valX, y); gap(rowGap)
  labelValue("Period End",   data.periodEnd,    col2x, valX, y); gap(rowGap)

  const rightEndY = y

  y = Math.max(leftEndY, rightEndY) + 8
  rule()

  // ── SECTION 4: LINE ITEMS TABLE ───────────────────────────────────────────
  const colDesc  = margin
  const colQty   = margin + 80
  const colUnit  = margin + 105
  const colAmt   = pageWidth - margin

  // Header row (gray background)
  const headerRowH = 8
  doc.setFillColor(245, 245, 245)
  doc.rect(margin - 2, y - 5, contentW + 4, headerRowH, "F")

  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(80, 80, 80)
  doc.text("DESCRIPTION",   colDesc, y)
  doc.text("QTY",           colQty,  y)
  doc.text("UNIT PRICE",    colUnit, y)
  doc.text("AMOUNT",        colAmt,  y, { align: "right" })

  gap(9)
  rule(0.15)

  // Subscription line item
  const unitLabel = data.amountUsd != null
    ? `$${data.amountUsd.toFixed(2)}`
    : data.amountKes != null
      ? `KES ${data.amountKes.toFixed(2)}`
      : "—"

  const amtLabel = unitLabel // qty is always 1

  doc.setFontSize(9.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(20, 20, 20)
  doc.text(`VendoFlow ${data.planTier} — ${data.billingCycle}`, colDesc, y)
  doc.text("1",       colQty,  y)
  doc.text(unitLabel, colUnit, y)
  doc.text(amtLabel,  colAmt,  y, { align: "right" })

  gap(7)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(140, 140, 140)
  doc.text(`Period: ${data.periodStart} – ${data.periodEnd}`, colDesc, y)
  gap(6)

  rule(0.3)

  // Total row
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(10, 10, 10)
  doc.text("TOTAL", colUnit, y)
  doc.text(amtLabel, colAmt, y, { align: "right" })

  gap(14)
  rule()

  // ── SECTION 5: PAYMENT INFORMATION ───────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(60, 60, 60)
  doc.text("PAYMENT INFORMATION", margin, y)
  gap(6)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(80, 80, 80)

  if (mpesaPaybill) {
    doc.text(
      `M-Pesa Paybill: ${mpesaPaybill}  ·  Account: ${data.invoiceNumber}`,
      margin, y
    )
    gap(5)
  }

  if (bankName || bankAccount) {
    doc.text(
      `Bank Transfer: ${bankName}  ·  Account: ${bankAccount}`,
      margin, y
    )
    gap(5)
  }

  doc.setTextColor(59, 130, 246)
  doc.text("Card: myshop.vendoflow.com/billing", margin, y)
  gap(10)

  // ── SECTION 6: NOTES (optional) ──────────────────────────────────────────
  if (data.notes && data.notes.trim().length > 0) {
    rule()
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(140, 140, 140)
    doc.text("NOTES", margin, y)
    gap(5)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    const noteLines = doc.splitTextToSize(data.notes, contentW)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 5
    gap(4)
  }

  // ── SECTION 7: FOOTER ─────────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerY    = pageHeight - 10

  doc.setLineWidth(0.2)
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(160, 160, 160)
  doc.text("VendoFlow  ·  support@vendoflow.com", pageWidth / 2, footerY, { align: "center" })

  // ── Output ────────────────────────────────────────────────────────────────
  const buf = doc.output("arraybuffer")
  return new Uint8Array(buf)
}
