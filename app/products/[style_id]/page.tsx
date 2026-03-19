import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { notFound, redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
import { StyleInventoryByStoreTable } from "@/components/products/StyleInventoryByStoreTable"

export const dynamic = "force-dynamic"

type StyleRow = Tables<"product_styles">
type VariantRow = Tables<"product_variants">
type StoreRow = Tables<"stores">

type PageProps = {
  params: Promise<{ style_id: string }>
}

type InventoryByStoreRow = {
  variant_id: string
  size: string
  color: string
  sku: string
  stores: Array<{
    store_id: string
    store_name: string
    quantity_on_hand: number
  }>
  total_stock: number
}

type FetchResult = {
  style: Pick<StyleRow, "style_id" | "name" | "image_url" | "base_price" | "cost">
  stores: Array<Pick<StoreRow, "store_id" | "name">>
  inventory: InventoryByStoreRow[]
}

async function fetchStyleInventory(styleId: string): Promise<FetchResult> {
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
    redirect("/onboarding")
  }

  const { data: style, error: styleError } = await supabase
    .from("product_styles")
    .select("style_id,name,image_url,base_price,cost,account_id")
    .eq("style_id", styleId)
    .eq("account_id", accountId)
    .single()

  if (styleError || !style) {
    notFound()
  }

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id,name")
    .eq("account_id", accountId)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(storesError.message)
  }

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("variant_id,size,color,sku")
    .eq("style_id", styleId)
    .order("size", { ascending: true })
    .order("color", { ascending: true })

  if (variantsError) {
    throw new Error(variantsError.message)
  }

  if (!variants || variants.length === 0) {
    const signedImageUrl = style.image_url
      ? await getSignedStorageUrl(supabase, style.image_url)
      : null

    return {
      style: {
        style_id: style.style_id,
        name: style.name ?? "",
        image_url: signedImageUrl ?? style.image_url,
        base_price: style.base_price ?? 0,
        cost: style.cost ?? 0,
      },
      stores: stores ?? [],
      inventory: [],
    }
  }

  const variantIds = variants.map((v: Pick<VariantRow, "variant_id">) => v.variant_id)

  const { data: levels, error: levelsError } = await supabase
    .from("inventory_levels")
    .select("variant_id,store_id,quantity_on_hand")
    .in("variant_id", variantIds)

  if (levelsError) {
    throw new Error(levelsError.message)
  }

  const inventory: InventoryByStoreRow[] = variants.map(
    (variant: Pick<VariantRow, "variant_id" | "size" | "color" | "sku">) => {
      const perStore = (stores ?? []).map((store: Pick<StoreRow, "store_id" | "name">) => {
        const level = (levels ?? []).find(
          (l: { variant_id: string; store_id: string; quantity_on_hand: number | null }) =>
            l.variant_id === variant.variant_id && l.store_id === store.store_id
        )
        return {
          store_id: store.store_id,
          store_name: store.name ?? "",
          quantity_on_hand: level?.quantity_on_hand ?? 0,
        }
      })

      const total = perStore.reduce(
        (sum: number, s: { quantity_on_hand: number }) => sum + (s.quantity_on_hand ?? 0),
        0
      )

      return {
        variant_id: variant.variant_id,
        size: variant.size ?? "",
        color: variant.color ?? "",
        sku: variant.sku ?? "",
        stores: perStore,
        total_stock: total,
      }
    }
  )

  const signedImageUrl = style.image_url
    ? await getSignedStorageUrl(supabase, style.image_url)
    : null

  return {
    style: {
      style_id: style.style_id,
      name: style.name ?? "",
      image_url: signedImageUrl ?? style.image_url,
      base_price: style.base_price ?? 0,
      cost: style.cost ?? 0,
    },
    stores: stores ?? [],
    inventory,
  }
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

async function StyleInventoryPageContent({ styleId }: { styleId: string }) {
  const data = await fetchStyleInventory(styleId)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            {data.style.image_url ? (
              <Image
                src={data.style.image_url}
                alt={data.style.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                No image
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-sm">
              <Link
                href="/products"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                ← Back to products
              </Link>
            </div>
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 mt-2">
              Inventory by store for each variant.
            </p>
            <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
              {data.style.name}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/products/${data.style.style_id}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-background px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-background-dark dark:text-zinc-100"
          >
            Edit style
          </Link>
          <Link
            href="/inventory"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-background px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-background-dark dark:text-zinc-100"
          >
            View all inventory
          </Link>
        </div>
      </div>

      <StyleInventoryByStoreTable
        stores={data.stores}
        inventory={data.inventory}
        styleName={data.style.name}
      />
    </div>
  )
}

export default async function Page({ params }: PageProps) {
  const { style_id } = await params

  return (
    <Suspense fallback={<LoadingState />}>
      <StyleInventoryPageContent styleId={style_id} />
    </Suspense>
  )
}

