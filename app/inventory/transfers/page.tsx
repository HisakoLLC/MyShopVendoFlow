import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { TransfersList } from "./transfers-list"

export const dynamic = "force-dynamic"

type Transfer = {
  transfer_id: string
  from_store_id: string | null
  to_store_id: string | null
  variant_id: string | null
  quantity: number
  status: string | null
  created_date: string | null
  completed_date: string | null
  stores_from: {
    name: string
  } | null
  stores_to: {
    name: string
  } | null
  from_store?: {
    name: string
  } | null
  to_store?: {
    name: string
  } | null
  product_variants: {
    size: string
    color: string
    sku: string
    product_styles: {
      name: string
      image_url: string | null
    } | null
  } | null
}

async function fetchTransfers(): Promise<Transfer[]> {
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
    redirect("/onboarding?redirect=/inventory/transfers")
  }

  // Fetch transfers for stores in this account
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("account_id", accountId)

  if (storesError) {
    throw new Error(storesError.message)
  }

  const storeIds = (stores || []).map((s: { store_id: string }) => s.store_id)
  if (storeIds.length === 0) {
    return []
  }

  const { data: transfers, error: transfersError } = await supabase
    .from("inventory_transfers")
    .select(
      `
      transfer_id,
      from_store_id,
      to_store_id,
      variant_id,
      quantity,
      status,
      created_date,
      completed_date,
      product_variants(
        size,
        color,
        sku,
        product_styles!inner(
          name,
          image_url,
          account_id
        )
      )
    `
    )
    .or(`from_store_id.in.(${storeIds.join(",")}),to_store_id.in.(${storeIds.join(",")})`)
    .eq("product_variants.product_styles.account_id", accountId)
    .order("created_date", { ascending: false })

  if (transfersError) {
    throw new Error(transfersError.message)
  }

  // Fetch store names separately
  const allStoreIds = new Set<string>()
  ;(transfers || []).forEach((t) => {
    if (t.from_store_id) allStoreIds.add(t.from_store_id)
    if (t.to_store_id) allStoreIds.add(t.to_store_id)
  })

  const { data: storeNames, error: storeNamesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .in("store_id", Array.from(allStoreIds))

  const storeMap = new Map<string, string>()
  ;(storeNames || []).forEach((store) => {
    storeMap.set(store.store_id, store.name)
  })

  // Transform the data to include store names
  return (transfers || []).map((transfer) => {
    return {
      ...transfer,
      stores_from: transfer.from_store_id
        ? { name: storeMap.get(transfer.from_store_id) || "Unknown" }
        : null,
      stores_to: transfer.to_store_id
        ? { name: storeMap.get(transfer.to_store_id) || "Unknown" }
        : null,
    } as Transfer
  })
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn't load transfers</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function TransfersPageContent() {
  let transfers: Transfer[]
  try {
    transfers = await fetchTransfers()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load transfers."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <TransfersList transfers={transfers} />
    </div>
  )
}

export default function TransfersPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <TransfersPageContent />
    </Suspense>
  )
}
