import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { VariantMatrixBuilder } from "@/components/products/VariantMatrixBuilder"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ style_id: string }>
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

async function VariantsPageContent({ styleId }: { styleId: string }) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          You must be signed in to create variants.
        </div>
      </div>
    )
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    redirect("/onboarding")
  }

  const { data: style, error: styleError } = await supabase
    .from("product_styles")
    .select("style_id, name, base_price, cost")
    .eq("style_id", styleId)
    .eq("account_id", accountId)
    .single()

  if (styleError || !style) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6">
        <div className="mb-2">
          <Link
            href="/products"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← Back to products
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Generate Variants: {style.name}
        </h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <span>Base Price: KES {new Intl.NumberFormat("en-KE").format(style.base_price)}</span>
          <span>•</span>
          <span>Cost: KES {new Intl.NumberFormat("en-KE").format(style.cost)}</span>
        </div>
      </div>

      <VariantMatrixBuilder
        styleId={style.style_id}
        styleName={style.name}
        basePrice={style.base_price}
        baseCost={style.cost}
      />
    </div>
  )
}

export default async function Page({ params }: PageProps) {
  const { style_id } = await params

  return (
    <Suspense fallback={<LoadingState />}>
      <VariantsPageContent styleId={style_id} />
    </Suspense>
  )
}
