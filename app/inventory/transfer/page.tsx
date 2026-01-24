import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { TransferInventoryForm } from "./transfer-inventory-form"

export const dynamic = "force-dynamic"

type Store = {
  store_id: string
  name: string
}

async function fetchStores(): Promise<Store[]> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    redirect("/onboarding?redirect=/inventory/transfer")
  }

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountId)
    .eq("active", true)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(storesError.message)
  }

  return (stores || []) as Store[]
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn't load form</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function TransferInventoryContent() {
  let stores: Store[]
  try {
    stores = await fetchStores()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load stores."
    return <ErrorState message={message} />
  }

  if (stores.length < 2) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/30 dark:text-yellow-100">
          <div className="text-base font-semibold">Multiple Stores Required</div>
          <div className="mt-1 text-sm opacity-90">
            You need at least 2 active stores to transfer inventory. Create another store in
            Settings → Stores.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Transfer Inventory
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Move stock from one store to another
        </p>
      </div>

      <TransferInventoryForm stores={stores} />
    </div>
  )
}

export default function TransferInventoryPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <TransferInventoryContent />
    </Suspense>
  )
}
