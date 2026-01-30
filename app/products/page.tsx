import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Package, Plus } from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
import { ProductsTableClient, type ProductStyleListRow } from "./products-table-client"
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
        categories ( name ),
        seasons ( name )
      `
      )
      .eq("account_id", accountId)
      .or("archived.is.null,archived.eq.false")
      .order("created_at", { ascending: false })

    if (stylesError) {
      throw handleSupabaseError(stylesError)
    }

    const nonArchived = (styles ?? []).filter((s: { archived: boolean | null }) => !s.archived)
    const styleIds = nonArchived.map((s: { style_id: string }) => s.style_id)

    // Variant count per style
    let variantCountByStyle: Record<string, number> = {}
    if (styleIds.length > 0) {
      const { data: variantRows } = await supabase
        .from("product_variants")
        .select("style_id")
        .in("style_id", styleIds)
      variantCountByStyle = (variantRows ?? []).reduce(
        (acc: Record<string, number>, row: { style_id: string }) => {
          acc[row.style_id] = (acc[row.style_id] ?? 0) + 1
          return acc
        },
        {}
      )
    }

    const stylesWithSignedUrls = await Promise.all(
      (nonArchived as Array<{ image_url?: string | null; style_id: string }>).map(async (s) => {
        if (!s.image_url) return { ...s, variant_count: variantCountByStyle[s.style_id] ?? 0 }
        const signed = await getSignedStorageUrl(supabase, s.image_url)
        return {
          ...s,
          image_url: signed ?? s.image_url,
          variant_count: variantCountByStyle[s.style_id] ?? 0,
        }
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

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn’t load products</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
        <div className="mt-4">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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
    // Re-throw redirect errors (Next.js uses special error for redirects)
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

  // Show empty state if no products
  if (data.styles.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Products</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Manage your product catalog and variants
            </p>
          </div>
          <Link
            href="/products/new"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary-600 px-6 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
          >
            Add Product
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Package className="h-14 w-14 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
            No products yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-400">
            Add your first product to start tracking inventory and processing sales.
          </p>
          <Link
            href="/products/new"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-primary-600 px-6 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
          >
            Add Product
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Products</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage your product catalog and variants
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        >
          <Plus className="h-5 w-5" />
          Add Product
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

