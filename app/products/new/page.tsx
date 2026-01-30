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

type FetchResult =
  | { ok: true; data: FetchOptionsResult }
  | { ok: false; error: string; redirect?: boolean }

async function fetchCreateStyleOptions(): Promise<FetchResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "You must be signed in to create a style." }
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] ?? null : accountIdRaw
  if (accountIdError || accountId == null || accountId === "") {
    redirect("/onboarding")
  }

  const accountIdStr = typeof accountId === "string" ? accountId : String(accountId)

  const [{ data: categories, error: categoriesError }, { data: seasons, error: seasonsError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("category_id,name")
        .eq("account_id", accountIdStr)
        .order("name", { ascending: true }),
      supabase
        .from("seasons")
        .select("season_id,name")
        .eq("account_id", accountIdStr)
        .order("name", { ascending: true }),
    ])

  if (categoriesError) {
    return { ok: false, error: categoriesError.message }
  }
  if (seasonsError) {
    return { ok: false, error: seasonsError.message }
  }

  const catList = (categories ?? []).map((c: Pick<CategoryRow, "category_id" | "name">) => ({
    category_id: c.category_id,
    name: c.name ?? "",
  }))
  const seasonList = (seasons ?? []).map((s: Pick<SeasonRow, "season_id" | "name">) => ({
    season_id: s.season_id,
    name: s.name ?? "",
  }))

  return {
    ok: true,
    data: {
      categories: catList as Array<Pick<CategoryRow, "category_id" | "name">>,
      seasons: seasonList as Array<Pick<SeasonRow, "season_id" | "name">>,
    },
  }
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mb-6 h-9 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-96 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-5 text-danger-900 dark:border-danger-900/40 dark:bg-danger-950/30 dark:text-danger-100">
        <div className="text-base font-semibold">Couldn&apos;t load form</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
        <div className="mt-4">
          <Link
            href="/products"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Back to Products
          </Link>
        </div>
      </div>
    </div>
  )
}

async function CreateStylePageContent() {
  let result: FetchResult
  try {
    result = await fetchCreateStyleOptions()
  } catch (err) {
    if (err != null && typeof err === "object" && "digest" in err) {
      const digest = String((err as { digest?: string }).digest ?? "")
      if (digest.includes("NEXT_REDIRECT")) throw err
    }
    const message = err instanceof Error ? err.message : "Unable to load form options."
    return <ErrorState message={message} />
  }

  if (!result.ok) {
    return <ErrorState message={result.error} />
  }

  const { categories, seasons } = result.data

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8">
          <Link
            href="/products"
            className="inline-block text-sm font-medium text-slate-600 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
          >
            ← Back to Products
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
            Add New Product
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Create a new product style with variants
          </p>
        </div>

        <CreateStyleForm categories={categories} seasons={seasons} />
      </div>
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

