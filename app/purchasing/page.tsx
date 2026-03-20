import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Package, Plus, FileText, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/format-currency"

export const dynamic = "force-dynamic"

type POListItem = {
  po_id: string
  po_number: string
  order_date: string | null
  status: string | null
  total_cost: number | null
  suppliers: { name: string } | null
}

async function fetchPurchasingData(): Promise<{
  list: POListItem[]
  currency: string
}> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) redirect("/login")

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw)
    ? accountIdRaw[0]
    : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (accountIdError || !accountId) redirect("/onboarding")

  const { data: bs } = await supabase
    .from("business_settings")
    .select("currency")
    .eq("account_id", accountId)
    .single()
  const currency = (bs as { currency?: string } | null)?.currency ?? "KES"

  const { data: rows, error } = await supabase
    .from("purchase_orders")
    .select(
      `
      po_id,
      po_number,
      order_date,
      status,
      total_cost,
      suppliers!inner(name, account_id)
    `
    )
    .eq("suppliers.account_id", accountId)
    .order("order_date", { ascending: false })
    .order("po_number", { ascending: false })

  if (error) throw new Error(error.message)
  return { list: (rows || []) as POListItem[], currency }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "sent":
      return "Sent"
    case "partially_received":
      return "Partially received"
    case "received":
      return "Received"
    default:
      return status ?? "Draft"
  }
}

function statusBadgeClass(status: string | null): string {
  const base = "rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
  switch (status) {
    case "draft":
      return `${base} bg-zinc-800 text-zinc-400 border border-zinc-700`
    case "sent":
      return `${base} bg-blue-400/10 text-blue-400 border border-blue-400/20`
    case "partially_received":
      return `${base} bg-amber-400/10 text-amber-400 border border-amber-400/20`
    case "received":
      return `${base} bg-emerald-400/10 text-emerald-400 border border-emerald-400/20`
    case "cancelled":
      return `${base} bg-red-400/10 text-red-400 border border-red-400/20`
    default:
      return `${base} bg-zinc-800 text-zinc-400 border border-zinc-700`
  }
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

async function PurchasingContent() {
  let data: { list: POListItem[]; currency: string }
  try {
    data = await fetchPurchasingData()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load purchase orders."
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          <div className="font-semibold">Couldn't load purchase orders</div>
          <div className="mt-1 text-sm opacity-90">{message}</div>
        </div>
      </div>
    )
  }

  const { list, currency } = data
  const drafts = list.filter((po) => po.status === "draft")
  const notReceived = list.filter(
    (po) => po.status === "sent" || po.status === "partially_received"
  )
  const received = list.filter((po) => po.status === "received")

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
          Manage purchase orders, restock suggestions, and receive inventory.
        </p>
        <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
          Purchasing
        </h1>
      </div>

      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Button asChild className="gap-2 rounded-sm">
          <Link href="/purchasing/restock">
            <Truck className="h-4 w-4" />
            Restock suggestions
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2 rounded-sm">
          <Link href="/purchasing/new">
            <Plus className="h-4 w-4" />
            Create PO
          </Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900 p-4">
          <div className="font-editorial text-3xl font-bold text-zinc-50 mb-1">
            {drafts.length}
          </div>
          <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Drafts</div>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900 p-4">
          <div className="font-editorial text-3xl font-bold text-zinc-50 mb-1">
            {notReceived.length}
          </div>
          <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Not yet received</div>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900 p-4">
          <div className="font-editorial text-3xl font-bold text-zinc-50 mb-1">
            {received.length}
          </div>
          <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Received</div>
        </div>
      </div>

      {/* PO list */}
      <div>
        <div className="mb-4">
          <h2 className="font-editorial text-xl font-bold text-zinc-50">
            Purchase orders
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            View, print, or receive inventory for any PO.
          </p>
        </div>
        {list.length === 0 ? (
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 px-6 py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" />
            <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              No purchase orders yet
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create one from restock suggestions or start a new PO.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/purchasing/restock">Restock suggestions</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/purchasing/new">Create PO</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((po) => {
                  const canReceive =
                    po.status === "sent" || po.status === "partially_received"
                  return (
                    <TableRow key={po.po_id}>
                      <TableCell className="font-mono text-xs text-zinc-400">
                        <Link
                          href={`/purchasing/${po.po_id}`}
                          className="hover:underline"
                        >
                          {po.po_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {po.suppliers?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {po.order_date
                          ? new Date(po.order_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(po.status)}>
                          {statusLabel(po.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-zinc-100">
                        {formatCurrency(po.total_cost ?? 0, currency, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="bg-transparent border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-7 px-3 text-xs font-semibold tracking-[0.1em] uppercase transition-colors shadow-none">
                            <Link href={`/purchasing/${po.po_id}`}>View</Link>
                          </Button>
                          {canReceive && (
                            <Button asChild variant="outline" size="sm" className="gap-1">
                              <Link href={`/purchasing/${po.po_id}/receive`}>
                                <Package className="h-3.5 w-3.5" />
                                Receive
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PurchasingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PurchasingContent />
    </Suspense>
  )
}
