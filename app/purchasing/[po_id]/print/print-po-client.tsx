"use client"

import * as React from "react"
import { formatCurrency } from "@/lib/format-currency"

type POLineItem = {
  line_item_id: string
  quantity_ordered: number
  quantity_received: number | null
  unit_cost: number
  line_total: number
  product_variants: {
    size: string
    color: string
    sku: string
    product_styles: {
      name: string
    } | null
  } | null
}

type PurchaseOrder = {
  po_number: string
  order_date: string | null
  expected_delivery_date: string | null
  status: string | null
  total_cost: number | null
  suppliers: {
    name: string
    email?: string | null
    phone?: string | null
  } | null
}

export function PrintPOClient({
  poId,
  po,
  lineItems,
  currency = "KES",
}: {
  poId: string
  po: PurchaseOrder
  lineItems: POLineItem[]
  currency?: string
}) {
  const handlePrint = () => {
    window.print()
  }

  const orderDate = po.order_date
    ? new Date(po.order_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—"

  const expectedDate = po.expected_delivery_date
    ? new Date(po.expected_delivery_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—"

  const total = formatCurrency(po.total_cost ?? 0, currency, {
    maximumFractionDigits: 2,
  })

  return (
    <>
      {/* Toolbar - hidden when printing */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-card px-6 py-3 print:hidden">
        <h1 className="font-sans text-lg font-semibold text-foreground">
          PO #{po.po_number} — Print or save as PDF
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.close()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="rounded-lg bg-[#E8400C] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#c73508]"
          >
            Print
          </button>
        </div>
      </div>

      {/* Document - with top padding so toolbar doesn't overlap */}
      <div className="mx-auto max-w-4xl px-6 pb-12 pt-20 print:pt-0">
        <div className="mb-8 text-center">
          <h1 className="font-sans text-2xl font-bold text-foreground">Purchase Order</h1>
          <p className="mt-1 font-mono text-lg font-semibold text-muted-foreground">
            PO #{po.po_number}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <h2 className="mb-2 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
              Supplier
            </h2>
            <p className="font-semibold text-foreground">
              {po.suppliers?.name ?? "—"}
            </p>
            {po.suppliers?.email && (
              <p className="text-sm text-muted-foreground">{po.suppliers.email}</p>
            )}
            {po.suppliers?.phone && (
              <p className="text-sm text-muted-foreground">{po.suppliers.phone}</p>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
              Dates
            </h2>
            <p className="text-sm text-muted-foreground">Order: {orderDate}</p>
            <p className="text-sm text-muted-foreground">
              Expected: {expectedDate}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm table-fixed">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th className="py-2 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground" style={{ width: '30%' }}>
                  Product
                </th>
                <th className="py-2 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground" style={{ width: '25%' }}>
                  Variant
                </th>
                <th className="py-2 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground" style={{ width: '10%' }}>
                  Qty
                </th>
                <th className="py-2 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground" style={{ width: '17.5%' }}>
                  Unit cost
                </th>
                <th className="py-2 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground" style={{ width: '17.5%' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => {
                const styleName =
                  item.product_variants?.product_styles?.name ?? "—"
                const variant = item.product_variants
                  ? `${item.product_variants.size} / ${item.product_variants.color}`
                  : "—"

                return (
                  <tr key={item.line_item_id} className="border-b border-border">
                    <td className="py-2 text-foreground">
                      {styleName}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {variant}
                    </td>
                    <td className="py-2 text-right text-foreground font-mono tabular-nums">
                      {item.quantity_ordered}
                    </td>
                    <td className="py-2 text-right text-foreground font-mono tabular-nums">
                      {formatCurrency(item.unit_cost, currency, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 text-right font-medium text-foreground font-mono tabular-nums">
                      {formatCurrency(item.line_total, currency, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground">
                <td colSpan={4} className="py-3 text-right font-semibold text-foreground">
                  Total:
                </td>
                <td className="py-3 text-right font-mono text-lg font-bold text-foreground tabular-nums">
                  {total}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-12 text-center text-xs text-muted-foreground">
          Generated from VendoFlow — PO #{po.po_number}
        </div>
      </div>
    </>
  )
}