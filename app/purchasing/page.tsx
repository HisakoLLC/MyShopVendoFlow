import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Package, Plus, FileText, Truck, Users } from "lucide-react"

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
  const base = "rounded-md text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
  switch (status) {
    case "draft":
      return `${base} bg-muted text-muted-foreground border border-border`
    case "sent":
      return `${base} bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20`
    case "partially_received":
      return `${base} bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20`
    case "received":
      return `${base} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`
    case "cancelled":
      return `${base} bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20`
    default:
      return `${base} bg-muted text-muted-foreground border border-border`
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

async function PurchasingContent() {
  let data: { list: POListItem[]; currency: string }
  try {
    data = await fetchPurchasingData()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load purchase orders."
    return (
      <div className="px-8 py-10">
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
    <div className="px-8 py-8">
      <div className="mb-8">
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Manage purchase orders, restock suggestions, and receive inventory.
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-tight leading-tight text-foreground">
          Purchasing
        </h1>
      </div>

      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Button asChild className="gap-2 rounded-md bg-[#E8400C] hover:bg-[#c73508] text-white">
          <Link href="/purchasing/restock">
            <Truck className="h-4 w-4" />
            Restock suggestions
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2 rounded-md border-border text-foreground hover:bg-accent">
          <Link href="/purchasing/new">
            <Plus className="h-4 w-4" />
            Create PO
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <Link 
          href="/purchasing/suppliers" 
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline inline-flex items-center gap-1"
        >
          Manage Suppliers →
        </Link>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
            {drafts.length}
          </div>
          <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-2">Drafts</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
            {notReceived.length}
          </div>
          <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-2">Not yet received</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
            {received.length}
          </div>
          <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-2">Received</div>
        </div>
      </div>

      {/* PO list */}
      <div>
        <div className="mb-4">
          <h2 className="font-sans text-xl font-bold text-foreground">
            Purchase orders
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            View, print, or receive inventory for any PO.
          </p>
        </div>
        {list.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-6 py-12 text-center shadow-sm">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              No purchase orders yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one from restock suggestions or start a new PO.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild size="sm" className="rounded-md bg-[#E8400C] hover:bg-[#c73508] text-white">
                <Link href="/purchasing/restock">Restock suggestions</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-md border-border text-foreground hover:bg-accent">
                <Link href="/purchasing/new">Create PO</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-border bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">PO #</TableHead>
                    <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Supplier</TableHead>
                    <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Order date</TableHead>
                    <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Status</TableHead>
                    <TableHead className="px-4 py-3 text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Total</TableHead>
                    <TableHead className="px-4 py-3 text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {list.map((po) => {
                  const canReceive =
                    po.status === "sent" || po.status === "partially_received"
                  return (
                    <TableRow key={po.po_id} className="border-b border-border hover:bg-accent/50 transition-colors duration-100 last:border-0">
                      <TableCell className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                        <Link
                          href={`/purchasing/${po.po_id}`}
                          className="hover:underline text-foreground font-medium"
                        >
                          {po.po_number}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-sm font-semibold text-foreground">
                        {po.suppliers?.name ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                        {po.order_date
                          ? new Date(po.order_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <span className={statusBadgeClass(po.status)}>
                          {statusLabel(po.status)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right text-sm font-semibold text-foreground tabular-nums font-mono">
                        {formatCurrency(po.total_cost ?? 0, currency, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2 px-1">
                          <Link href={`/purchasing/${po.po_id}`}>
                            <button type="button" className="border border-border text-foreground hover:bg-accent rounded-md h-7 px-3 text-xs font-semibold uppercase transition-colors bg-background items-center justify-center flex">
                              View
                            </button>
                          </Link>
                          {canReceive && (
                            <Button asChild variant="outline" size="sm" className="gap-1 rounded-md border-border text-foreground hover:bg-accent">
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
