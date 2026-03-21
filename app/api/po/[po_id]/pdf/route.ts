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

  const doc = new jsPDF({ format: "a4", unit: "mm" })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 20

  // Title
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("PURCHASE ORDER", 20, y)
  y += 15

  // Header (two columns: BILL FROM & BILL TO)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  
  doc.text("BILL FROM", 20, y)
  doc.text("BILL TO", 110, y)
  
  y += 5
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  
  const bsData = bs as any
  const supplier = (po as any).suppliers

  // Section 1: BILL FROM
  const bsName = bsData?.business_name || "Your Business"
  doc.text(bsName, 20, y)
  doc.text(supplier?.name ?? "—", 110, y)
  
  doc.setFont("helvetica", "normal")
  y += 5
  
  let leftY = y
  if (bsData?.address) { doc.text(bsData.address, 20, leftY); leftY += 5 }
  if (bsData?.phone) { doc.text(bsData.phone, 20, leftY); leftY += 5 }
  if (bsData?.email) { doc.text(bsData.email, 20, leftY); leftY += 5 }
  if (bsData?.tax_id) { doc.text(`VAT/Tax ID: ${bsData.tax_id}`, 20, leftY); leftY += 5 }
  
  let rightY = y
  if (supplier?.email) { doc.text(supplier.email, 110, rightY); rightY += 5 }
  if (supplier?.phone) { doc.text(supplier.phone, 110, rightY); rightY += 5 }
  // Section 2: Payment Terms in Bill To
  if (supplier?.payment_terms) { 
    doc.text(`Terms: ${supplier.payment_terms}`, 110, rightY); 
    rightY += 5 
  }
  
  y = Math.max(leftY, rightY) + 12

  // PO Meta Section
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text("PO NUMBER", 20, y)
  doc.text("ORDER DATE", 55, y)
  doc.text("EXPECTED DELIVERY", 95, y)
  doc.text("STATUS", 145, y)
  y += 5

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(`#${(po as any).po_number}`, 20, y)
  
  const orderDate = (po as any).order_date
    ? new Date((po as any).order_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—"
  doc.text(orderDate, 55, y)
  
  const expectedDate = (po as any).expected_delivery_date
    ? new Date((po as any).expected_delivery_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—"
  doc.text(expectedDate, 95, y)
  
  doc.text(String((po as any).status || "DRAFT").toUpperCase(), 145, y)
  y += 5

  // Table header
  const colW = [70, 45, 15, 25, 30]
  const colX = [20, 90, 135, 150, 175]
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Product", colX[0], y)
  doc.text("Variant", colX[1], y)
  doc.text("Qty", colX[2], y)
  doc.text("Unit cost", colX[3], y)
  doc.text("Total", colX[4], y)
  y += 6
  doc.setDrawColor(0, 0, 0)
  doc.line(20, y, pageW - 20, y)
  y += 6

  const currSym = currency === "USD" ? "$" : currency === "KES" ? "Ksh " : `${currency} `
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  for (const item of lineItems as Array<{
    quantity_ordered: number
    unit_cost: number
    line_total: number
    product_variants: {
      size: string
      color: string
      product_styles: { name: string } | null
    } | null
  }>) {
    const pv = item.product_variants
    const name = pv?.product_styles?.name ?? "—"
    const variant = pv ? `${pv.size} / ${pv.color}` : "—"
    const line1 = name.length > 28 ? name.slice(0, 28) + "…" : name
    doc.text(line1, colX[0], y)
    doc.text(variant, colX[1], y)
    doc.text(String(item.quantity_ordered), colX[2], y)
    doc.text(`${currSym}${item.unit_cost.toFixed(2)}`, colX[3], y)
    doc.text(`${currSym}${item.line_total.toFixed(2)}`, colX[4], y)
    y += 6
    if (y > 260) {
      doc.addPage()
      y = 20
    }
  }

  y += 4
  doc.setDrawColor(220, 220, 220)
  doc.line(20, y, pageW - 20, y)
  y += 8

  // Section 4: Notes & Instructions
  if ((po as any).notes) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text("NOTES / INSTRUCTIONS", 20, y)
    y += 4
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    
    const splitNotes = doc.splitTextToSize((po as any).notes, pageW - 40)
    doc.text(splitNotes, 20, y)
    y += (splitNotes.length * 5) + 5
    
    doc.setDrawColor(220, 220, 220)
    doc.line(20, y, pageW - 20, y)
    y += 8
  }

  // Section 5: Totals Section
  if (y > 250) { doc.addPage(); y = 20; }
  const subtotal = (lineItems as any[]).reduce((sum, item) => sum + (item.line_total || 0), 0)
  const total = (po as any).total_cost ?? subtotal
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text("Subtotal:", colX[3], y)
  doc.text(`${currSym}${subtotal.toFixed(2)}`, colX[4], y)
  
  y += 6
  doc.setDrawColor(200, 200, 200)
  doc.line(colX[3], y, pageW - 20, y)
  y += 6
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("TOTAL:", colX[3], y)
  doc.text(`${currSym}${total.toFixed(2)}`, colX[4], y)
  y += 20

  // Section 6: Footer
  const footerY = 282
  doc.setDrawColor(220, 220, 220)
  doc.line(20, footerY - 5, pageW - 20, footerY - 5)
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont("helvetica", "normal")
  const bFullName = bsData?.business_name || "VendoFlow"
  doc.text(`This purchase order is issued by ${bFullName}. Please confirm receipt and expected delivery date.`, 20, footerY)
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  doc.text(`Generated by VendoFlow · ${dateStr}`, pageW - 20, footerY, { align: "right" })

  // Section 7: Signature Area
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text("Authorized signature / Stamp", 20, y)
  doc.text("Received by:", 75, y)
  doc.text("Date", 155, y)
  y += 8
  doc.setDrawColor(180, 180, 180)
  doc.line(20, y, 70, y)         // Authorized signature line
  doc.line(75, y, 150, y)        // Received by line
  doc.line(155, y, pageW - 20, y) // Date line


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
