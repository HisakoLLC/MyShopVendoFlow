import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRightLeft } from "lucide-react"
import { TransferInventoryForm } from "./transfer-inventory-form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function TransferInventoryPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  // Resolve account and basic role; middleware already enforces path access
  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError) {
    redirect("/onboarding?redirect=/inventory/transfer")
  }
  const aid =
    Array.isArray(accountIdRaw) ? accountIdRaw[0]
    : accountIdRaw != null && typeof accountIdRaw === "object" && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (!aid) {
    redirect("/onboarding?redirect=/inventory/transfer")
  }

  // Only owners/managers should access; cashiers get redirected in middleware,
  // but we add a defensive check here as well.
  const { data: staffRow } = await supabase
    .from("staff")
    .select("role, active")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  if (staffRow && staffRow.active !== false && staffRow.role === "cashier") {
    redirect("/pos")
  }

  const { data: stores } = await supabase
    .from("stores")
    .select("store_id,name")
    .eq("account_id", aid)
    .order("name", { ascending: true })

  const safeStores =
    (stores || []).map((s: { store_id: string; name: string }) => ({
      store_id: s.store_id,
      name: s.name,
    })) ?? []

  // Transfer history is fetched via API in the client component below.

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <ArrowRightLeft className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Transfer Inventory
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Move stock between stores when one location is low and another has excess.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)]">
        <TransferInventoryForm stores={safeStores} />
      </div>

      <div className="mt-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Transfers
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Last 50 transfers for this account
          </p>
        </div>
        <TransferHistoryTable />
      </div>
    </div>
  )
}

function TransferHistorySkeleton() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-background-card-light p-4 dark:border-border-dark dark:bg-background-card-dark">
      <div className="mb-3 h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-32 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

type HistoryRow = {
  transfer_id: string
  created_at: string
  product_name: string
  variant_details: string
  from_store_name: string
  to_store_name: string
  quantity: number
  status: string
  created_by_name: string
}

function TransferHistoryTable() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-background-card-light p-2 dark:border-border-dark dark:bg-background-card-dark">
      <TransferHistoryClient />
    </div>
  )
}

"use client"

import * as React from "react"

function TransferHistoryClient() {
  const [rows, setRows] = React.useState<HistoryRow[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/inventory/transfer-history", { cache: "no-store" })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          if (!cancelled) setError(body?.error || "Unable to load transfer history.")
          return
        }
        const data = (await res.json()) as { transfers?: HistoryRow[] }
        if (!cancelled) {
          setRows(data.transfers || [])
        }
      } catch (e) {
        if (!cancelled) {
          setError("Unable to load transfer history.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <TransferHistorySkeleton />
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
        No transfers recorded yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date / Time</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>From → To</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead>Initiated By</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.transfer_id}>
            <TableCell className="whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
              {t.created_at
                ? new Date(t.created_at).toLocaleString()
                : "—"}
            </TableCell>
            <TableCell className="text-sm">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {t.product_name}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {t.variant_details}
              </div>
            </TableCell>
            <TableCell className="text-sm">
              <div className="flex items-center gap-1">
                <span>{t.from_store_name}</span>
                <span className="text-xs text-zinc-400">→</span>
                <span>{t.to_store_name}</span>
              </div>
            </TableCell>
            <TableCell className="text-right text-sm font-semibold tabular-nums">
              {t.quantity}
            </TableCell>
            <TableCell className="text-sm text-zinc-700 dark:text-zinc-300">
              {t.created_by_name}
            </TableCell>
            <TableCell className="text-sm capitalize text-zinc-800 dark:text-zinc-200">
              {t.status}
            </TableCell>
            <TableCell className="text-right text-sm">
              <span className="cursor-pointer text-xs font-medium text-zinc-700 underline underline-offset-2 dark:text-zinc-300">
                View details
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

