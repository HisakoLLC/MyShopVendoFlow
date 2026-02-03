import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
import type { Tables } from "@/types/database"
import { EditStyleForm } from "@/components/products/EditStyleForm"

export const dynamic = "force-dynamic"

type CategoryRow = Tables<"categories">
type SeasonRow = Tables<"seasons">
type StyleRow = Tables<"product_styles">

type PageProps = {
  params: Promise<{ style_id: string }>
}

type FetchResult =
  | {
      ok: true
      style: StyleRow
      categories: Array<Pick<CategoryRow, "category_id" | "name">>
      seasons: Array<Pick<SeasonRow, "season_id" | "name">>
    }
  | { ok: false; notFound: true }
  | { ok: false; error: string }

async function fetchEditData(styleId: string): Promise<FetchResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "You must be signed in to edit a style." }
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] ?? null : accountIdRaw
  if (accountIdError || accountId == null || accountId === "") {
    return { ok: false, error: "Unable to resolve account." }
  }

  const accountIdStr = typeof accountId === "string" ? accountId : String(accountId)

  const { data: style, error: styleError } = await supabase
    .from("product_styles")
    .select("*")
    .eq("style_id", styleId)
    .eq("account_id", accountIdStr)
    .single()

  if (styleError || !style) {
    return { ok: false, notFound: true }
  }

  const [{ data: categories, error: catError }, { data: seasons, error: seasonError }] =
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

  if (catError || seasonError) {
    return { ok: false, error: catError?.message ?? seasonError?.message ?? "Failed to load options." }
  }

  const catList = (categories ?? []).map((c: Pick<CategoryRow, "category_id" | "name">) => ({
    category_id: c.category_id,
    name: c.name ?? "",
  }))
  const seasonList = (seasons ?? []).map((s: Pick<SeasonRow, "season_id" | "name">) => ({
    season_id: s.season_id,
    name: s.name ?? "",
  }))

  const styleWithSignedImage = { ...style }
  if (style.image_url) {
    const signed = await getSignedStorageUrl(supabase, style.image_url)
    if (signed) (styleWithSignedImage as { image_url: string }).image_url = signed
  }

  return {
    ok: true,
    style: styleWithSignedImage as StyleRow,
    categories: catList as Array<Pick<CategoryRow, "category_id" | "name">>,
    seasons: seasonList as Array<Pick<SeasonRow, "season_id" | "name">>,
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
        <div className="text-base font-semibold">Couldn&apos;t load style</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
        <div className="mt-4">
          <Link
            href="/products"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 dark:bg-primary dark:text-primary-foreground dark:hover:opacity-90"
          >
            Back to products
          </Link>
        </div>
      </div>
    </div>
  )
}

async function EditStylePageContent({ styleId }: { styleId: string }) {
  const result = await fetchEditData(styleId)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) notFound()
    return <ErrorState message={"error" in result ? result.error : "Style not found."} />
  }

  const { style, categories, seasons } = result

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
            Edit Style
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Update style details. Variants (sizes/colors) can be managed from the style page.
          </p>
        </div>
      </div>

      <EditStyleForm
        styleId={styleId}
        style={style}
        categories={categories}
        seasons={seasons}
      />
    </div>
  )
}

export default async function EditStylePage({ params }: PageProps) {
  const { style_id } = await params

  return (
    <Suspense fallback={<LoadingState />}>
      <EditStylePageContent styleId={style_id} />
    </Suspense>
  )
}
