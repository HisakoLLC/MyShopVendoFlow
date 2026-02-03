import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Package, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format-currency"

export const dynamic = "force-dynamic"

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
  po_id: string
  po_number: string
  order_date: string | null
  expected_delivery_date: string | null
  status: string | null
  total_cost: number | null
  suppliers: { name: string } | null
}

async function fetchPO(poId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) redirect("/login")

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) redirect("/onboarding")

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select(
      `
      po_id,
      po_number,
      order_date,
      expected_delivery_date,
      status,
      total_cost,
      suppliers!inner(name, account_id)
    `
    )
    .eq("po_id", poId)
    .eq("suppliers.account_id", accountId)
    .single()

  if (poError || !po) throw new Error("Purchase order not found or access denied.")

  const { data: lineItems, error: lineError } = await supabase
    .from("po_line_items")
    .select(
      `
      line_item_id,
      quantity_ordered,
      quantity_received,
      unit_cost,
      line_total,
      product_variants(size, color, sku, product_styles(name, account_id))
    `
    )
    .eq("po_id", poId)
    .eq("product_variants.product_styles.account_id", accountId)
    .order("line_item_id")

  if (lineError) throw new Error(lineError.message)

  const { data: bs } = await supabase
    .from("business_settings")
    .select("currency")
    .eq("account_id", accountId)
    .single()
  const currency = (bs as { currency?: string } | null)?.currency ?? "KES"

  return {
    po: po as PurchaseOrder,
    lineItems: (lineItems || []) as POLineItem[],
    currency,
  }
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ po_id: string }>
}) {
  const { po_id } = await params
  let data: { po: PurchaseOrder; lineItems: POLineItem[]; currency: string }
  try {
    data = await fetchPO(po_id)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load PO."
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          <div className="font-semibold">Couldn't load purchase order</div>
          <div className="mt-1 text-sm opacity-90">{message}</div>
          <Link href="/purchasing/restock" className="mt-4 inline-block text-sm font-medium underline">
            Back to Purchasing
          </Link>
        </div>
      </div>
    )
  }

  const { po, lineItems, currency } = data
  const statusLabel =
    po.status === "received"
      ? "Received"
      : po.status === "partially_received"
        ? "Partially received"
        : po.status === "sent"
          ? "Sent"
          : "Draft"

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/purchasing/restock"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← Purchasing
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            PO #{po.po_number}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{statusLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <a
              href={`/api/po/${po_id}/pdf`}
              download={`PO-${po.po_number}.pdf`}
              className="inline-flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
          {po.status !== "received" && (
            <Button asChild className="gap-2">
              <Link href={`/purchasing/${po_id}/receive`}>
                <Package className="h-4 w-4" />
                Receive inventory
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-background-card-light p-6 dark:border-border-dark dark:bg-background-card-dark">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Supplier
            </div>
            <div className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
              {po.suppliers?.name ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Order date
            </div>
            <div className="mt-0.5 text-zinc-900 dark:text-zinc-100">
              {po.order_date ? new Date(po.order_date).toLocaleDateString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Expected delivery
            </div>
            <div className="mt-0.5 text-zinc-900 dark:text-zinc-100">
              {po.expected_delivery_date
                ? new Date(po.expected_delivery_date).toLocaleDateString()
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Total
            </div>
            <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(po.total_cost ?? 0, currency, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-background-card-light dark:border-border-dark dark:bg-background-card-dark">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Line items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  Product
                </th>
                <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  Variant / SKU
                </th>
                <th className="px-6 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                  Qty ordered
                </th>
                <th className="px-6 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                  Qty received
                </th>
                <th className="px-6 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                  Unit cost
                </th>
                <th className="px-6 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                  Line total
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => {
                const styleName = item.product_variants?.product_styles?.name ?? "—"
                const variant =
                  item.product_variants
                    ? `${item.product_variants.size} / ${item.product_variants.color}`
                    : "—"
                const sku = item.product_variants?.sku ?? "—"
                const received = item.quantity_received ?? 0
                return (
                  <tr
                    key={item.line_item_id}
                    className="border-b border-zinc-100 dark:border-zinc-800/50"
                  >
                    <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {styleName}
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                      {variant}
                      <span className="ml-1 font-mono text-zinc-500 dark:text-zinc-500">
                        {sku}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-zinc-900 dark:text-zinc-100">
                      {item.quantity_ordered}
                    </td>
                    <td className="px-6 py-3 text-right text-zinc-900 dark:text-zinc-100">
                      {received}
                    </td>
                    <td className="px-6 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {formatCurrency(item.unit_cost, currency, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(item.line_total, currency, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
