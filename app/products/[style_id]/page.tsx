import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

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
    <div className="min-h-screen bg-zinc-950 px-8 py-8">
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-zinc-800" />
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-lg bg-zinc-800" />
    </div>
  )
}

async function StyleInventoryPageContent({ styleId }: { styleId: string }) {
  const data = await fetchStyleInventory(styleId)

  return (
    <div className="min-h-screen bg-zinc-950 px-8 py-8">
      {/* Back link */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-100 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to products
      </Link>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 mb-6 border-b border-zinc-800">
        <div className="flex items-start gap-4">
          {/* Product image */}
          <div className="relative h-16 w-16 overflow-hidden rounded-md bg-zinc-800 flex-shrink-0">
            {data.style.image_url ? (
              <Image
                src={data.style.image_url}
                alt={data.style.name}
                fill
                className="object-cover"
              />
            ) : null}
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-1">
              INVENTORY BY STORE FOR EACH VARIANT
            </p>
            <h1 className="font-editorial text-3xl font-bold text-zinc-50">
              {data.style.name}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/products/${data.style.style_id}/edit`}
            className="inline-flex h-9 items-center justify-center rounded-sm bg-white px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-950 hover:bg-zinc-100 transition-colors"
          >
            Edit Style
          </Link>
          <Link
            href="/inventory"
            className="inline-flex h-9 items-center justify-center rounded-sm border border-zinc-700 px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors bg-transparent"
          >
            View All Inventory
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
