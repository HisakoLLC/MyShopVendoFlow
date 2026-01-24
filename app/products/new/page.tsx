import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"
import { CreateStyleForm } from "@/components/products/CreateStyleForm"

export const dynamic = "force-dynamic"

type CategoryRow = Tables<"categories">
type SeasonRow = Tables<"seasons">

type FetchOptionsResult = {
  categories: Array<Pick<CategoryRow, "category_id" | "name">>
  seasons: Array<Pick<SeasonRow, "season_id" | "name">>
}

async function fetchCreateStyleOptions(): Promise<FetchOptionsResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create a style.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    redirect("/onboarding")
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
    throw new Error(categoriesError.message)
  }
  if (seasonsError) {
    throw new Error(seasonsError.message)
  }

  return {
    categories: (categories ?? []) as Array<Pick<CategoryRow, "category_id" | "name">>,
    seasons: (seasons ?? []) as Array<Pick<SeasonRow, "season_id" | "name">>,
  }
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn't load form</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
        <div className="mt-4">
          <Link
            href="/products"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Back to products
          </Link>
        </div>
      </div>
    </div>
  )
}

async function CreateStylePageContent() {
  let options: FetchOptionsResult
  try {
    options = await fetchCreateStyleOptions()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load form options."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <Link
              href="/products"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              ← Back to products
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Add New Style
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create a style first, then add variants (sizes/colors) next.
          </p>
        </div>
      </div>

      <CreateStyleForm categories={options.categories} seasons={options.seasons} />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CreateStylePageContent />
    </Suspense>
  )
}

