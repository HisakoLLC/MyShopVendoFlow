import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"
import { InventoryTableClient } from "./inventory-table-client"

export const dynamic = "force-dynamic"

type StoreRow = Tables<"stores">
type StyleRow = Tables<"product_styles">

type InventoryData = {
  variant_id: string
  style_id: string
  style_name: string
  style_image_url: string | null
  size: string
  color: string
  sku: string
  price: number
  cost: number
  stores: Array<{
    store_id: string
    store_name: string
    quantity_on_hand: number | null
    quantity_reserved: number | null
  }>
  total_stock: number
}

type FetchResult = {
  stores: Array<Pick<StoreRow, "store_id" | "name">>
  inventory: InventoryData[]
}

async function fetchInventoryData(): Promise<FetchResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to view inventory.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    redirect("/onboarding")
  }

  // Fetch stores
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id,name")
    .eq("account_id", accountId)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(storesError.message)
  }

  // Fetch all variants with their styles
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select(
      `
      variant_id,
      style_id,
      size,
      color,
      sku,
      price,
      cost,
      product_styles!inner (
        style_id,
        name,
        image_url,
        account_id
      )
    `
    )
    .eq("product_styles.account_id", accountId)

  if (variantsError) {
    throw new Error(variantsError.message)
  }

  // Fetch inventory levels for all variants
  const variantIds = (variants ?? []).map((v: { variant_id: string }) => v.variant_id)
  if (variantIds.length === 0) {
    return { stores: stores ?? [], inventory: [] }
  }

  const { data: inventoryLevels, error: inventoryError } = await supabase
    .from("inventory_levels")
    .select("variant_id,store_id,quantity_on_hand,quantity_reserved")
    .in("variant_id", variantIds)

  if (inventoryError) {
    throw new Error(inventoryError.message)
  }

  // Group inventory by variant and store
  const inventoryMap = new Map<string, InventoryData>()

  ;(variants ?? []).forEach((variant: { 
    variant_id: string
    style_id: string | null
    size: string
    color: string
    sku: string
    price: number | null
    cost: number | null
    product_styles: {
      style_id: string
      name: string
      image_url: string | null
      account_id: string
    } | null
  }) => {
    const style = variant.product_styles as unknown as StyleRow
    const key = variant.variant_id

    const storeInventories = (stores ?? []).map((store: { store_id: string; name: string }) => {
      const level = (inventoryLevels ?? []).find(
        (il: { variant_id: string; store_id: string; quantity_on_hand: number | null; quantity_reserved: number | null }) => il.variant_id === variant.variant_id && il.store_id === store.store_id
      )

      return {
        store_id: store.store_id,
        store_name: store.name,
        quantity_on_hand: level?.quantity_on_hand ?? 0,
        quantity_reserved: level?.quantity_reserved ?? 0,
      }
    })

    const totalStock = storeInventories.reduce(
      (sum: number, s: { quantity_on_hand: number | null }) => sum + (s.quantity_on_hand ?? 0),
      0
    )

    inventoryMap.set(key, {
      variant_id: variant.variant_id,
      style_id: variant.style_id ?? "",
      style_name: style.name,
      style_image_url: style.image_url,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      price: variant.price ?? 0,
      cost: variant.cost ?? 0,
      stores: storeInventories,
      total_stock: totalStock,
    })
  })

  return {
    stores: stores ?? [],
    inventory: Array.from(inventoryMap.values()),
  }
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
        <div className="text-base font-semibold">Couldn't load inventory</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function InventoryPageContent() {
  let data: FetchResult
  try {
    data = await fetchInventoryData()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load inventory."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Inventory Management
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View and manage stock levels across all stores
          </p>
        </div>
      </div>

      <InventoryTableClient stores={data.stores} inventory={data.inventory} />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <InventoryPageContent />
    </Suspense>
  )
}
