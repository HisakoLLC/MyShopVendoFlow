import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Package, Plus, FileText, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

type POListItem = {
  po_id: string
  po_number: string
  order_date: string | null
  status: string | null
  total_cost: number | null
  suppliers: { name: string } | null
}

async function fetchPOList(): Promise<POListItem[]> {
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
  return (rows || []) as POListItem[]
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
  switch (status) {
    case "draft":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
    case "sent":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
    case "partially_received":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    case "received":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
  let list: POListItem[] = []
  try {
    list = await fetchPOList()
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

  const drafts = list.filter((po) => po.status === "draft")
  const notReceived = list.filter(
    (po) => po.status === "sent" || po.status === "partially_received"
  )
  const received = list.filter((po) => po.status === "received")

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Purchasing
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage purchase orders, restock suggestions, and receive inventory.
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Button asChild className="gap-2">
          <Link href="/purchasing/restock">
            <Truck className="h-4 w-4" />
            Restock suggestions
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/purchasing/new">
            <Plus className="h-4 w-4" />
            Create PO
          </Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {drafts.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Drafts</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {notReceived.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Not yet received</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {received.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Received</div>
        </div>
      </div>

      {/* PO list */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Purchase orders
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            View, print, or receive inventory for any PO.
          </p>
        </div>
        {list.length === 0 ? (
          <div className="px-6 py-12 text-center">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                    PO #
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                    Order date
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((po) => {
                  const canReceive =
                    po.status === "sent" || po.status === "partially_received"
                  return (
                    <tr
                      key={po.po_id}
                      className="border-b border-zinc-100 dark:border-zinc-800/50"
                    >
                      <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        <Link
                          href={`/purchasing/${po.po_id}`}
                          className="hover:underline"
                        >
                          {po.po_number}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                        {po.suppliers?.name ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                        {po.order_date
                          ? new Date(po.order_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(po.status)}`}
                        >
                          {statusLabel(po.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                        ${(po.total_cost ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="ghost" size="sm">
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
