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
    product_styles: { name: string } | null
  } | null
}

type PurchaseOrder = {
  po_number: string
  order_date: string | null
  expected_delivery_date: string | null
  status: string | null
  total_cost: number | null
  suppliers: { name: string; email?: string | null; phone?: string | null } | null
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
  const total = formatCurrency(po.total_cost ?? 0, currency, { maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-background-light text-text-primary-light dark:bg-background-dark dark:text-text-primary-dark print:bg-white print:text-black">
      {/* Toolbar - hidden when printing */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 border-b border-border-light bg-background-card-light px-4 py-3 dark:border-border-dark dark:bg-background-card-dark shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-medium text-zinc-600">
            PO #{po.po_number} — Print or save as PDF
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.close()}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Document - with top padding so toolbar doesn't overlap */}
      <div className="mx-auto max-w-3xl px-8 pb-16 pt-24">
        <header className="mb-10 border-b-2 border-zinc-900 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Purchase Order
          </h1>
          <p className="mt-1 text-xl font-semibold text-zinc-700">PO #{po.po_number}</p>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-6 text-sm">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Supplier
            </h2>
            <p className="font-semibold text-zinc-900">{po.suppliers?.name ?? "—"}</p>
            {po.suppliers?.email && (
              <p className="mt-0.5 text-zinc-600">{po.suppliers.email}</p>
            )}
            {po.suppliers?.phone && (
              <p className="text-zinc-600">{po.suppliers.phone}</p>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Dates
            </h2>
            <p className="text-zinc-900">
              <span className="text-zinc-500">Order date:</span> {orderDate}
            </p>
            <p className="mt-0.5 text-zinc-900">
              <span className="text-zinc-500">Expected delivery:</span> {expectedDate}
            </p>
          </div>
        </section>

        <section>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-900 bg-zinc-100">
                <th className="py-3 pr-4 text-left font-semibold text-zinc-900">Product</th>
                <th className="py-3 pr-4 text-left font-semibold text-zinc-900">Variant / SKU</th>
                <th className="py-3 pr-4 text-right font-semibold text-zinc-900">Qty</th>
                <th className="py-3 pr-4 text-right font-semibold text-zinc-900">Unit cost</th>
                <th className="py-3 text-right font-semibold text-zinc-900">Line total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => {
                const styleName = item.product_variants?.product_styles?.name ?? "—"
                const variant = item.product_variants
                  ? `${item.product_variants.size} / ${item.product_variants.color}`
                  : "—"
                const sku = item.product_variants?.sku ?? "—"
                return (
                  <tr key={item.line_item_id} className="border-b border-zinc-200">
                    <td className="py-3 pr-4 font-medium text-zinc-900">{styleName}</td>
                    <td className="py-3 pr-4 text-zinc-700">
                      {variant}
                      <span className="ml-1 font-mono text-zinc-500">{sku}</span>
                    </td>
                    <td className="py-3 pr-4 text-right text-zinc-900">
                      {item.quantity_ordered}
                    </td>
                    <td className="py-3 pr-4 text-right text-zinc-900">
                      {formatCurrency(item.unit_cost, currency, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-medium text-zinc-900">
                      {formatCurrency(item.line_total, currency, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end border-t-2 border-zinc-900 pt-4">
            <p className="text-lg font-bold text-zinc-900">Total: {total}</p>
          </div>
        </section>

        <footer className="mt-12 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500">
          Generated from VendoFlow — PO #{po.po_number}
        </footer>
      </div>
    </div>
  )
}
