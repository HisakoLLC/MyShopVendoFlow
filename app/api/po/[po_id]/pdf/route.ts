import { NextRequest } from "next/server"
import { jsPDF } from "jspdf"
import { requireAccountAccess, requireAuth } from "@/lib/api/auth-helper"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ po_id: string }> }
) {
  const { po_id } = await params
  try {
    console.log(`[API][PDF] Generating for PO ID: "${po_id}" (type: ${typeof po_id})`)

    const { user, supabase, error: authError } = await requireAuth(_request)
    if (authError || !user) {
      console.warn("[API][PDF] Unauthorized")
      return new Response("Unauthorized", { status: 401 })
    }

    const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
    console.log(`[API][PDF] Account ID from RPC: "${JSON.stringify(accountId)}" (type: ${typeof accountId})`)

    if (accountIdError || !accountId) {
      console.warn("[API][PDF] Account access denied", accountIdError)
      return new Response("Account not found", { status: 403 })
    }

    const { data: bs } = await supabase.from("business_settings").select("*").eq("account_id", accountId).single()
    const currency = (bs as any)?.currency ?? "KES"

    const { data: samplePO, error: sampleError } = await supabase.from("purchase_orders").select("*").limit(1)
    console.log(`[API][PDF] Sample PO row: ${JSON.stringify(samplePO?.[0] || sampleError)}`)

    // Simpler query for PO: filter by po_id first, then verify account_id
    const { data: initialPO, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        po_number,
        order_date,
        expected_delivery_date,
        total_cost,
        status,
        suppliers!inner(name, account_id)
      `)
      .eq("po_id", po_id)
      .maybeSingle()

    let po = initialPO
    if (!po) {
      console.log(`[API][PDF] PO not found by po_id, trying id...`)
      const { data: altPO, error: altError } = await supabase
        .from("purchase_orders")
        .select(`
          po_number,
          order_date,
          expected_delivery_date,
          total_cost,
          status,
          suppliers!inner(name, account_id)
        `)
        .eq("id", po_id)
        .maybeSingle()


      if (altPO) {
        console.log("[API][PDF] Found PO using 'id' column!")
        po = altPO
      } else {
        console.warn("[API][PDF] PO not found by po_id or id:", po_id, poError, altError)
        return new Response(`Purchase order not found: ${po_id}`, { status: 404 })
      }
    }


    const poAccountId = (po as any).suppliers?.account_id
    console.log(`[API][PDF] PO Supplier Account ID: "${poAccountId}"`)

    if (poAccountId !== accountId) {
      console.warn("[API][PDF] Account mismatch:", { poAccountId, accountId })
      return new Response("Access denied to this purchase order", { status: 403 })
    }

    const { data: lineItems, error: lineError } = await supabase
      .from("po_line_items")
      .select(
        `
      quantity_ordered,
      unit_cost,
      line_total,
      product_variants(size, color, sku, product_styles(name, account_id))
    `
      )
      .eq("po_id", po_id)
      .eq("product_variants.product_styles.account_id", accountId)
      .order("line_item_id")

    if (lineError || !lineItems?.length) {
      console.warn("[API][PDF] Failed to load line items for PO:", po_id, lineError)
      return new Response("Failed to load line items", { status: 500 })
    }

    console.log("[API][PDF] Data fetched, creating jsPDF doc...")

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "—"
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    }

    const doc = new jsPDF({ format: "a4", unit: "mm" })
    const pageWidth = doc.internal.pageSize.getWidth() // 210
    const pageHeight = doc.internal.pageSize.getHeight() // 297
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let y = margin // Y cursor starts at top margin

    // HELPER FUNCTIONS
    const gap = (n: number) => {
      y += n
    }

    const rule = (thickness = 0.2) => {
      doc.setLineWidth(thickness)
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      gap(4)
    }

    const checkPage = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 25) {
        doc.addPage()
        y = margin
      }
    }

    const bsData = bs as any
    const supplier = (po as any).suppliers

    // SECTION 1 — TITLE
    y = margin
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("PURCHASE ORDER", margin, y)
    gap(12)

    // SECTION 2 — BILL FROM / BILL TO (two columns)
    const col1x = margin
    const col2x = pageWidth / 2 + 5
    const startY = y

    // BILL FROM (left column)
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(120, 120, 120)
    doc.text("BILL FROM", col1x, y)
    gap(5)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    const fromName = bsData?.business_name || "Your Business"
    doc.text(fromName, col1x, y)
    gap(5)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    if (bsData?.address) {
      doc.text(bsData.address, col1x, y)
      gap(4)
    }
    if (bsData?.phone) {
      doc.text(bsData.phone, col1x, y)
      gap(4)
    }
    if (bsData?.email) {
      doc.text(bsData.email, col1x, y)
      gap(4)
    }
    if (bsData?.tax_id) {
      doc.text("VAT/Tax ID: " + bsData.tax_id, col1x, y)
      gap(4)
    }
    const leftColEndY = y

    // BILL TO (right column) — reset Y to startY
    y = startY

    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(120, 120, 120)
    doc.text("BILL TO", col2x, y)
    gap(5)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text(supplier?.name || "", col2x, y)
    gap(5)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    if (supplier?.email) {
      doc.text(supplier.email, col2x, y)
      gap(4)
    }
    if (supplier?.phone) {
      doc.text(supplier.phone, col2x, y)
      gap(4)
    }
    if (supplier?.payment_terms) {
      doc.text("Terms: " + supplier.payment_terms, col2x, y)
      gap(4)
    }

    // Set Y to whichever column was taller
    y = Math.max(leftColEndY, y) + 10
    rule()

    // SECTION 3 — PO META (horizontal row of 3 items)
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(120, 120, 120)
    doc.text("PO NUMBER", margin, y)
    doc.text("ORDER DATE", margin + 55, y)
    doc.text("EXPECTED DELIVERY", margin + 110, y)
    gap(5)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("#" + (po as any).po_number, margin, y)
    doc.text(formatDate((po as any).order_date), margin + 55, y)
    doc.text(formatDate((po as any).expected_delivery_date), margin + 110, y)
    gap(10)
    rule()

    // SECTION 4 — LINE ITEMS TABLE HEADER
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 100, 100)
    // Column positions:
    const col = {
      product: margin, // width ~70mm
      variant: margin + 75, // width ~35mm
      qty: margin + 115, // width ~15mm
      unitCost: margin + 135, // width ~25mm
      total: margin + 162, // width ~28mm
    }
    doc.text("PRODUCT", col.product, y)
    doc.text("VARIANT", col.variant, y)
    doc.text("QTY", col.qty, y)
    doc.text("UNIT COST", col.unitCost, y)
    doc.text("TOTAL", col.total, y)
    gap(4)
    rule(0.3)

    // SECTION 5 — LINE ITEMS ROWS
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)

    for (const item of lineItems as any[]) {
      checkPage(10)
      const pv = item.product_variants
      const name = pv?.product_styles?.name ?? "—"
      const variant = pv ? `${pv.size} / ${pv.color}` : "—"

      doc.text(name, col.product, y, { maxWidth: 68 })
      doc.text(variant, col.variant, y, { maxWidth: 35 })
      doc.text(String(item.quantity_ordered), col.qty, y)
      doc.text(currency + " " + item.unit_cost.toFixed(2), col.unitCost, y)
      doc.text(currency + " " + item.line_total.toFixed(2), col.total, y)
      gap(8)
    }
    rule()

    // SECTION 6 — NOTES
    if ((po as any).notes && (po as any).notes.trim().length > 0) {
      checkPage(20)
      doc.setFontSize(7)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(120, 120, 120)
      doc.text("NOTES / INSTRUCTIONS", margin, y)
      gap(5)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      const noteLines = doc.splitTextToSize((po as any).notes, contentWidth)
      doc.text(noteLines, margin, y)
      y += noteLines.length * 5
      gap(6)
      rule()
    }

    // SECTION 7 — TOTALS (right-aligned)
    checkPage(25)
    const subtotal = (lineItems as any[]).reduce((sum: number, item: any) => sum + (item.line_total || 0), 0)
    const totalsLabelX = margin + 120
    const totalsValueX = pageWidth - margin

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    doc.text("Subtotal:", totalsLabelX, y)
    doc.text(currency + " " + subtotal.toFixed(2), totalsValueX, y, { align: "right" })
    gap(5)

    rule(0.5)

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("TOTAL:", totalsLabelX, y)
    doc.text(currency + " " + subtotal.toFixed(2), totalsValueX, y, { align: "right" })
    gap(16)

    // SECTION 8 — SIGNATURE AREA
    checkPage(45)
    rule()
    gap(4)

    const sig1x = margin
    const sig2x = margin + 60
    const sig3x = margin + 130

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    doc.text("Authorized signature / Stamp", sig1x, y)
    doc.text("Received by:", sig2x, y)
    doc.text("Date:", sig3x, y)
    gap(12)

    // Signature lines
    doc.setDrawColor(180, 180, 180)
    doc.line(sig1x, y, sig1x + 50, y)
    doc.line(sig2x, y, sig2x + 50, y)
    doc.line(sig3x, y, sig3x + 50, y)
    gap(4)

    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text("Sign and stamp here", sig1x, y)
    doc.text("(DD/MM/YYYY)", sig3x, y)
    gap(12)

    // SECTION 9 — FOOTER
    const footerY = pageHeight - 12
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(160, 160, 160)

    const footerLeft =
      "This purchase order is issued by " + (bsData?.business_name || "the buyer") + ". Please confirm receipt and expected delivery date."
    doc.text(footerLeft, margin, footerY, { maxWidth: 130 })

    doc.text("This document is an official Purchase Order. · " + new Date().toLocaleDateString("en-GB"), pageWidth - margin, footerY, { align: "right" }) // Date line


    const filename = `PO-${(po as { po_number: string }).po_number}.pdf`
    const buf = doc.output("arraybuffer")
    const uint8array = new Uint8Array(buf)

    console.log("[API][PDF] PDF created, size:", uint8array.byteLength)

    return new Response(uint8array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": uint8array.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[API][PDF] Error generating PDF:", err)
    return new Response("Internal Server Error", { status: 500 })
  }
}
