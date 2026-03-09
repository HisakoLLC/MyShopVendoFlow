import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransferInventoryForm } from "./transfer-inventory-form"
import { TransferHistoryClient } from "./TransferHistoryClient"

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
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
        <div className="shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to inventory
            </Link>
          </Button>
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

function TransferHistoryTable() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-background-card-light p-2 dark:border-border-dark dark:bg-background-card-dark">
      <TransferHistoryClient />
    </div>
  )
}
