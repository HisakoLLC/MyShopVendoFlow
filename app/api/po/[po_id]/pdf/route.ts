import { NextRequest } from "next/server"
import { jsPDF } from "jspdf"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ po_id: string }> }
) {
  const { po_id } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw)
    ? accountIdRaw[0]
    : typeof accountIdRaw === "object" &&
        accountIdRaw !== null &&
        "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (accountIdError || !accountId) {
    return new Response("Account not found", { status: 403 })
  }

  const { data: bs } = await supabase.from("business_settings").select("currency").eq("account_id", accountId).single()
  const currency = (bs as { currency?: string } | null)?.currency ?? "KES"

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select(
      `
      po_number,
      order_date,
      expected_delivery_date,
      total_cost,
      suppliers!inner(name, email, phone, account_id)
    `
    )
    .eq("po_id", po_id)
    .eq("suppliers.account_id", accountId)
    .single()

  if (poError || !po) {
    return new Response("Purchase order not found", { status: 404 })
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
    return new Response("Failed to load line items", { status: 500 })
  }

  const doc = new jsPDF({ format: "a4", unit: "mm" })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 20

  // Title
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("PURCHASE ORDER", 20, y)
  y += 10

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(`PO #${(po as { po_number: string }).po_number}`, 20, y)
  y += 12

  // Supplier & dates (two columns)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Supplier", 20, y)
  doc.text("Dates", 110, y)
  y += 6
  doc.setFont("helvetica", "normal")
  const supplier = (po as { suppliers: { name: string; email?: string | null; phone?: string | null } }).suppliers
  doc.text(supplier?.name ?? "—", 20, y)
  const orderDate = (po as { order_date: string | null }).order_date
    ? new Date((po as { order_date: string }).order_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—"
  const expectedDate = (po as { expected_delivery_date: string | null }).expected_delivery_date
    ? new Date((po as { expected_delivery_date: string }).expected_delivery_date).toLocaleDateString(
        "en-US",
        { year: "numeric", month: "short", day: "numeric" }
      )
    : "—"
  doc.text(`Order: ${orderDate}`, 110, y)
  y += 5
  if (supplier?.email) doc.text(supplier.email, 20, y)
  doc.text(`Expected: ${expectedDate}`, 110, y)
  y += supplier?.email ? 5 : 0
  if (supplier?.phone) doc.text(supplier.phone, 20, y)
  y += 14

  // Table header
  const colW = [70, 45, 15, 25, 30]
  const colX = [20, 90, 135, 150, 175]
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Product", colX[0], y)
  doc.text("Variant / SKU", colX[1], y)
  doc.text("Qty", colX[2], y)
  doc.text("Unit cost", colX[3], y)
  doc.text("Total", colX[4], y)
  y += 6
  doc.setDrawColor(0, 0, 0)
  doc.line(20, y, pageW - 20, y)
  y += 6

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  for (const item of lineItems as Array<{
    quantity_ordered: number
    unit_cost: number
    line_total: number
    product_variants: {
      size: string
      color: string
      sku: string
      product_styles: { name: string } | null
    } | null
  }>) {
    const pv = item.product_variants
    const name = pv?.product_styles?.name ?? "—"
    const variant = pv ? `${pv.size} / ${pv.color}` : "—"
    const sku = pv?.sku ?? "—"
    const line1 = name.length > 28 ? name.slice(0, 28) + "…" : name
    doc.text(line1, colX[0], y)
    doc.text(`${variant} ${sku}`, colX[1], y)
    doc.text(String(item.quantity_ordered), colX[2], y)
    doc.text(`$${item.unit_cost.toFixed(2)}`, colX[3], y)
    doc.text(`$${item.line_total.toFixed(2)}`, colX[4], y)
    y += 6
    if (y > 260) {
      doc.addPage()
      y = 20
    }
  }

  y += 4
  doc.line(20, y, pageW - 20, y)
  y += 6
  doc.setFont("helvetica", "bold")
  const total = (po as { total_cost: number | null }).total_cost ?? 0
  const currSym = currency === "USD" ? "$" : currency === "KES" ? "Ksh " : `${currency} `
  doc.text("Total:", colX[3], y)
  doc.text(`${currSym}${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, colX[4], y)
  y += 16

  // Signature / stamp area
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("Authorized signature / Stamp", 20, y)
  y += 2
  doc.setDrawColor(180, 180, 180)
  doc.line(20, y, 90, y)
  doc.line(100, y, pageW - 20, y)
  y += 2
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text("Sign and stamp here", 20, y)
  doc.text("Date", 100, y)

  const filename = `PO-${(po as { po_number: string }).po_number}.pdf`
  const buf = doc.output("arraybuffer")

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
