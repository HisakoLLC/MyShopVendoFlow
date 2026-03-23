import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { CreatePOForm } from "./create-po-form"
import { RestockFromStorageLoader } from "./restock-from-storage-loader"

export const dynamic = "force-dynamic"

type Supplier = {
  supplier_id: string
  name: string
}

type Variant = {
  variant_id: string
  size: string
  color: string
  sku: string
  cost: number | null
  style_id: string
  product_styles: {
    name: string
    image_url: string | null
  } | null
}

type PrefillItem = {
  variant_id: string
  quantity: number
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw)
    ? accountIdRaw[0]
    : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (accountIdError || !accountId) {
    redirect("/onboarding?redirect=/purchasing/new")
  }

  const { data: suppliers, error: suppliersError } = await supabase
    .from("suppliers")
    .select("supplier_id, name")
    .eq("account_id", accountId)
    .order("name", { ascending: true })

  if (suppliersError) {
    throw new Error(suppliersError.message)
  }

  return (suppliers || []) as Supplier[]
}

async function fetchPrefillVariants(itemIds: string[]): Promise<Variant[]> {
  if (itemIds.length === 0) {
    return []
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return []
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw)
    ? accountIdRaw[0]
    : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (accountIdError || !accountId) {
    return []
  }

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select(
      `
      variant_id,
      size,
      color,
      sku,
      cost,
      style_id,
      product_styles!inner(
        name,
        image_url,
        account_id
      )
    `
    )
    .in("variant_id", itemIds)
    .eq("product_styles.account_id", accountId)

  if (variantsError) {
    console.error("Error fetching prefill variants:", variantsError)
    return []
  }

  return (variants || []) as Variant[]
}

function LoadingState() {
  return (
    <div className="w-full px-8 py-6">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="w-full px-8 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn't load form</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function CreatePOPageContent({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; items?: string }>
}) {
  const params = await searchParams
  let suppliers: Supplier[]
  let prefillItems: PrefillItem[] = []
  let prefillVariants: Variant[] = []

  try {
    suppliers = await fetchSuppliers()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load suppliers."
    return <ErrorState message={message} />
  }

  // Restock flow always uses client-side sessionStorage; never parse items from URL to avoid Server Components errors and URI limits
  const restockFromStorage = params.from === "restock"

  return (
    <div className="w-full px-8 py-6">
      <div className="mb-6">
        <a href="/purchasing" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-100 transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Purchasing
        </a>
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
          Create a new purchase order to suppliers
        </p>
        <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
          Create Purchase Order
        </h1>
      </div>

      {restockFromStorage ? (
        <RestockFromStorageLoader suppliers={suppliers} />
      ) : (
        <CreatePOForm
          suppliers={suppliers}
          prefillItems={prefillItems}
          prefillVariants={prefillVariants}
        />
      )}
    </div>
  )
}

export default async function CreatePOPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; items?: string }>
}) {
  return (
    <Suspense fallback={<LoadingState />}>
      <CreatePOPageContent searchParams={searchParams} />
    </Suspense>
  )
}
