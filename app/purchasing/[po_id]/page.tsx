import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Package, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format-currency"
import { PODownloadButton } from "./po-download-button"

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
    <div className="px-8 py-8">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
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
      <div className="px-8 py-10">
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
    <div className="px-8 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a
            href="/purchasing"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Purchasing
          </a>
          <div className="mb-2 mt-2">
            <span className={
              po.status === "received"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
                : po.status === "partially_received"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
                  : po.status === "sent"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
                    : po.status === "cancelled"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-md text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
                      : "bg-muted text-muted-foreground border border-border rounded-md text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
            }>
              {statusLabel}
            </span>
          </div>
          <h1 className="font-sans text-3xl font-bold tracking-tight leading-tight text-foreground">
            PO #{po.po_number}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PODownloadButton poId={po_id} poNumber={po.po_number} />
          {po.status !== "received" && (
            <Button asChild className="gap-2 rounded-md bg-[#E8400C] hover:bg-[#c73508] text-white">
              <Link href={`/purchasing/${po_id}/receive`}>
                <Package className="h-4 w-4" />
                Receive inventory
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card text-card-foreground p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Supplier
            </div>
            <div className="mt-0.5 font-medium text-foreground">
              {po.suppliers?.name ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Order date
            </div>
            <div className="mt-0.5 text-foreground">
              {po.order_date ? new Date(po.order_date).toLocaleDateString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Expected delivery
            </div>
            <div className="mt-0.5 text-foreground">
              {po.expected_delivery_date
                ? new Date(po.expected_delivery_date).toLocaleDateString()
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total
            </div>
            <div className="mt-0.5 font-semibold text-foreground font-mono tabular-nums">
              {formatCurrency(po.total_cost ?? 0, currency, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Line items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="h-12 px-6 py-3 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
                  Product
                </th>
                <th className="h-12 px-6 py-3 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
                  Variant / SKU
                </th>
                <th className="h-12 px-6 py-3 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
                  Qty ordered
                </th>
                <th className="h-12 px-6 py-3 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
                  Qty received
                </th>
                <th className="h-12 px-6 py-3 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
                  Unit cost
                </th>
                <th className="h-12 px-6 py-3 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
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
                    className="border-b border-border hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">
                      {styleName}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {variant}
                      <span className="ml-1 font-mono text-muted-foreground">
                        {sku}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-foreground font-mono tabular-nums">
                      {item.quantity_ordered}
                    </td>
                    <td className="px-6 py-3 text-right text-foreground font-mono tabular-nums">
                      {received}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground font-mono tabular-nums">
                      {formatCurrency(item.unit_cost, currency, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-foreground font-mono tabular-nums">
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
