import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { VariantMatrixBuilder } from "@/components/products/VariantMatrixBuilder"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ style_id: string }>
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

async function VariantsPageContent({ styleId }: { styleId: string }) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 px-8 py-8">
        <div className="rounded-sm border border-red-900/40 bg-red-950/30 p-5 text-red-100">
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
    <div className="min-h-screen bg-zinc-950 px-8 py-8">
      {/* Back link */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-100 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to products
      </Link>

      {/* Page header */}
      <div className="mb-8 pb-6 border-b border-zinc-800">
        <h1 className="font-editorial text-3xl font-bold text-zinc-50">
          Generate Variants: {style.name}
        </h1>
        <p className="text-xs text-zinc-500 mt-2 tracking-[0.05em]">
          BASE PRICE: KES {new Intl.NumberFormat("en-KE").format(style.base_price)}
          {" · "}
          COST: KES {new Intl.NumberFormat("en-KE").format(style.cost)}
        </p>
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
