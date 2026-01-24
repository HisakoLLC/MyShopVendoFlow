import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Package } from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"
import { ProductsTableClient, type ProductStyleListRow } from "./products-table-client"
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

    const nonArchived = (styles ?? []).filter((s) => !s.archived)

    return {
      categories: (categories ?? []) as Array<Pick<CategoryRow, "category_id" | "name">>,
      seasons: (seasons ?? []) as Array<Pick<SeasonRow, "season_id" | "name">>,
      styles: nonArchived as unknown as ProductStyleListRow[],
    }
  } catch (error) {
    logError(error, "fetchProductsData")
    throw error
  }
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-80 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn’t load products</div>
        <div className="mt-1 text-sm opacity-90">{props.message}</div>
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
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Products
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage your styles, pricing, and margins.
            </p>
          </div>
          <Link
            href="/products/new"
            className="hidden h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white md:inline-flex"
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
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Products
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your styles, pricing, and margins.
          </p>
        </div>
        <Link
          href="/products/new"
          className="hidden h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white md:inline-flex"
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

