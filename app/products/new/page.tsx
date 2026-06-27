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
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-5 text-red-100">
        <div className="text-base font-semibold">Couldn't load form</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
        <div className="mt-4">
          <Link
            href="/products"
            className="inline-flex items-center justify-center bg-[#E8400C] text-white hover:bg-[#c73508] rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
          >
            Back to products
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
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <Link
              href="/products"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to products
            </Link>
          </div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            Create a style first, then add variants (sizes/colors) next.
          </p>
          <h1 className="font-sans text-3xl font-bold leading-tight text-foreground">
            Add New Style
          </h1>
        </div>
      </div>

      <CreateStyleForm categories={categories} seasons={seasons} />
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

