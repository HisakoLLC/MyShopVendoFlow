import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { StoresList } from "./stores-list"

export const dynamic = "force-dynamic"

type Store = {
  store_id: string
  name: string
  address: string | null
  tax_rate: number | null
  timezone: string | null
  active: boolean | null
}

type Account = {
  account_id: string
  plan_tier: string | null
}

async function fetchStoresData(): Promise<{
  stores: Store[]
  account: Account
}> {
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
    redirect("/onboarding?redirect=/settings/stores")
  }

  // Fetch account to get plan_tier
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("account_id, plan_tier")
    .eq("account_id", accountId)
    .single()

  if (accountError) {
    throw new Error(accountError.message)
  }

  // Fetch stores
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name, address, tax_rate, timezone, active")
    .eq("account_id", accountId)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(storesError.message)
  }

  return {
    stores: (stores || []) as Store[],
    account: account as Account,
  }
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn't load stores</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function StoresPageContent() {
  let data: { stores: Store[]; account: Account }
  try {
    data = await fetchStoresData()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load stores."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <StoresList stores={data.stores} planTier={data.account.plan_tier || "starter"} />
    </div>
  )
}

export default function StoresPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <StoresPageContent />
    </Suspense>
  )
}
