import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { CreatePOForm } from "./create-po-form"

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
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
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

  // Handle pre-fill from restock suggestions
  if (params.from === "restock" && params.items) {
    try {
      prefillItems = JSON.parse(params.items) as PrefillItem[]
      const variantIds = prefillItems.map((item) => item.variant_id)
      prefillVariants = await fetchPrefillVariants(variantIds)
    } catch (err) {
      console.error("Error parsing prefill items:", err)
      // Continue without prefill
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Create Purchase Order
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create a new purchase order to suppliers
        </p>
      </div>

      {params.from === "restock" && prefillItems.length > 0 && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
          <p className="text-sm">
            Pre-filled from restock suggestions. Review and adjust as needed.
          </p>
        </div>
      )}

      <CreatePOForm
        suppliers={suppliers}
        prefillItems={prefillItems}
        prefillVariants={prefillVariants}
      />
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
