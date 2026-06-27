import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Package } from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
import { ProductsTableClient, type ProductStyleListRow } from "./products-table-client"
import { ProductsInventoryHint } from "@/components/products/ProductsInventoryHint"
import { EmptyState } from "@/components/EmptyState"
import { ProductsListSkeleton } from "./products-list-skeleton"
import { logError, getErrorMessage, handleSupabaseError } from "@/lib/errors"

export const dynamic = "force-dynamic"

type CategoryRow = Tables<"categories">
type SeasonRow = Tables<"seasons">
type FetchResult = {
  categories: Array<Pick<CategoryRow, "category_id" | "name">>
  seasons: Array<Pick<SeasonRow, "season_id" | "name">>
  styles: ProductStyleListRow[]
}

async function fetchProductsData(): Promise<FetchResult> {
  const supabase = await createServerSupabaseClient()

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      redirect("/login")
    }

    const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
    if (accountIdError || !accountId) {
      redirect("/onboarding?redirect=/products")
    }

    const [{ data: categories, error: categoriesError }, { data: seasons, error: seasonsError }] =
      await Promise.all([
        supabase
          .from("categories")
          .select("category_id,name")
          .eq("account_id", accountId)
          .order("name", { ascending: true }),
        supabase
          .from("seasons")
          .select("season_id,name")
          .eq("account_id", accountId)
          .order("name", { ascending: true }),
      ])

    if (categoriesError) {
      throw handleSupabaseError(categoriesError)
    }
    if (seasonsError) {
      throw handleSupabaseError(seasonsError)
    }

    const { data: styles, error: stylesError } = await supabase
      .from("product_styles")
      .select(
        `
        style_id,
        name,
        base_price,
        cost,
        image_url,
        category_id,
        season_id,
        archived,
        discount_percent,
        discount_ends_at,
        categories ( name ),
        seasons ( name )
      `
      )
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })

    if (stylesError) {
      throw handleSupabaseError(stylesError)
    }

    const stylesWithSignedUrls = await Promise.all(
      (styles ?? []).map(async (s: { image_url?: string | null }) => {
        if (!s.image_url) return s
        const signed = await getSignedStorageUrl(supabase, s.image_url)
        return { ...s, image_url: signed ?? s.image_url }
      })
    )

    return {
      categories: (categories ?? []) as Array<Pick<CategoryRow, "category_id" | "name">>,
      seasons: (seasons ?? []) as Array<Pick<SeasonRow, "season_id" | "name">>,
      styles: stylesWithSignedUrls as unknown as ProductStyleListRow[],
    }
  } catch (error) {
    logError(error, "fetchProductsData")
    throw error
  }
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-zinc-950 px-8 py-8">
      <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="h-9 w-36 animate-pulse rounded-sm bg-zinc-800" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-800" />
      <div className="mt-4 h-80 w-full animate-pulse rounded-lg bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 px-8 py-8">
      <div className="rounded-sm border border-red-900/40 bg-red-950/30 p-5 text-red-100">
        <div className="text-base font-semibold">Couldn&apos;t load products</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
        <div className="mt-4">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-sm bg-white px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-950 hover:bg-zinc-100 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

async function ProductsPageContent() {
  let data: FetchResult
  try {
    data = await fetchProductsData()
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof err.digest === "string" &&
      err.digest.includes("NEXT_REDIRECT")
    ) {
      throw err
    }
    const message = getErrorMessage(err, "Unable to load products.")
    return <ErrorState message={message} />
  }

  if (data.styles.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground px-8 py-8">
        <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
              MANAGE YOUR STYLES, PRICING, AND MARGINS
            </p>
            <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">
              Products
            </h1>
          </div>
          <Link
            href="/products/new"
            className="inline-flex items-center justify-center bg-[#E8400C] text-white hover:bg-[#c73508] rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
          >
            Add New Style
          </Link>
        </div>
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first style to get started. You can create styles, add variants, and manage inventory."
          action={{
            label: "Add New Style",
            href: "/products/new",
            onClick: () => {},
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-8 py-8">
      <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            MANAGE YOUR STYLES, PRICING, AND MARGINS
          </p>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">
            Products
          </h1>
          {data.styles.length === 1 && <ProductsInventoryHint />}
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center justify-center bg-[#E8400C] text-white hover:bg-[#c73508] rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
        >
          Add New Style
        </Link>
      </div>

      <ProductsTableClient styles={data.styles} categories={data.categories} seasons={data.seasons} />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<ProductsListSkeleton />}>
      <ProductsPageContent />
    </Suspense>
  )
}
