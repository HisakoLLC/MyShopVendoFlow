import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
import type { Tables } from "@/types/database"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, BarChart2 } from "lucide-react"
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

  const inventoryList = Array.from(inventoryMap.values())

  // Sign image URLs so they load for private Supabase storage buckets (same as /products)
  const uniqueImageUrls = [...new Set(inventoryList.map((i) => i.style_image_url).filter(Boolean))] as string[]
  const signedMap = new Map<string, string>()
  await Promise.all(
    uniqueImageUrls.map(async (url) => {
      const signed = await getSignedStorageUrl(supabase, url)
      if (signed) signedMap.set(url, signed)
    })
  )
  const inventoryWithSignedUrls = inventoryList.map((item) => ({
    ...item,
    style_image_url: (item.style_image_url && signedMap.get(item.style_image_url)) ?? item.style_image_url,
  }))

  return {
    stores: stores ?? [],
    inventory: inventoryWithSignedUrls,
  }
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
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
    <div className="min-h-screen bg-background text-foreground px-8 py-8">
      {/* Page Header */}
      <div className="flex items-start justify-between pb-6 mb-6 border-b border-border">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            VIEW AND MANAGE STOCK LEVELS ACROSS ALL STORES
          </p>
          <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight text-foreground">
            Inventory Management
          </h1>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button asChild className="bg-[#E8400C] text-white hover:bg-[#c73508] rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-all shadow-sm border-none">
            <Link href="/inventory/transfer">
              <ArrowLeftRight className="mr-2 w-3.5 h-3.5" />
              Transfer
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-transparent border-border text-foreground hover:bg-accent hover:text-foreground rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-all shadow-none">
            <Link href="/inventory/intelligence">
              <BarChart2 className="mr-2 w-3.5 h-3.5" />
              Intelligence
            </Link>
          </Button>
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
