import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
import { ReceiveInventoryForm } from "./receive-inventory-form"

export const dynamic = "force-dynamic"

type Store = {
  store_id: string
  name: string
}

type POLineItem = {
  line_item_id: string
  variant_id: string | null
  quantity_ordered: number
  quantity_received: number | null
  product_variants: {
    size: string
    color: string
    sku: string
    product_styles: {
      name: string
      image_url: string | null
    } | null
  } | null
}

type PurchaseOrder = {
  po_id: string
  po_number: string
  order_date: string | null
  expected_delivery_date: string | null
  status: string | null
  suppliers: {
    name: string
  } | null
}

async function fetchPOData(poId: string): Promise<{
  po: PurchaseOrder
  lineItems: POLineItem[]
  stores: Store[]
}> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    redirect("/onboarding")
  }

  // Fetch PO
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select(
      `
      po_id,
      po_number,
      order_date,
      expected_delivery_date,
      status,
      suppliers!inner(
        name,
        account_id
      )
    `
    )
    .eq("po_id", poId)
    .eq("suppliers.account_id", accountId)
    .single()

  if (poError || !po) {
    throw new Error("Purchase order not found or access denied.")
  }

  // Fetch line items
  const { data: lineItems, error: lineItemsError } = await supabase
    .from("po_line_items")
    .select(
      `
      line_item_id,
      variant_id,
      quantity_ordered,
      quantity_received,
      product_variants(
        size,
        color,
        sku,
        product_styles!inner(
          name,
          image_url,
          account_id
        )
      )
    `
    )
    .eq("po_id", poId)
    .eq("product_variants.product_styles.account_id", accountId)
    .order("line_item_id", { ascending: true })

  if (lineItemsError) {
    throw new Error(lineItemsError.message)
  }

  // Fetch stores
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountId)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(storesError.message)
  }

  return {
    po: po as PurchaseOrder,
    lineItems: (lineItems || []) as POLineItem[],
    stores: (stores || []) as Store[],
  }
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn't load purchase order</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
        <div className="mt-4">
          <Link
            href="/purchasing"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 dark:bg-primary dark:text-primary-foreground dark:hover:opacity-90"
          >
            Back to Purchasing
          </Link>
        </div>
      </div>
    </div>
  )
}

async function ReceiveInventoryContent({ poId }: { poId: string }) {
  let data: { po: PurchaseOrder; lineItems: POLineItem[]; stores: Store[] }
  try {
    data = await fetchPOData(poId)
    const supabase = await createServerSupabaseClient()
    // Sign Supabase storage URLs so product images load for private buckets
    const lineItemsWithSignedUrls = await Promise.all(
      data.lineItems.map(async (item) => {
        const style = item.product_variants?.product_styles
        if (!style?.image_url) return item
        const signed = await getSignedStorageUrl(supabase, style.image_url)
        return {
          ...item,
          product_variants: item.product_variants
            ? {
                ...item.product_variants,
                product_styles: { ...style, image_url: signed }
              }
            : null,
        }
      })
    )
    data = { ...data, lineItems: lineItemsWithSignedUrls }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load purchase order."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6">
        <div className="mb-2">
          <Link
            href={`/purchasing/${poId}`}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← Back to PO
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Receive Inventory: PO #{data.po.po_number}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Record received inventory from supplier. You can receive the full order or partial
          quantities—enter only what you received today; you can receive the rest later.
        </p>
      </div>

      {/* PO Details */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-background p-6 dark:border-zinc-800 dark:bg-background">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          PO Details
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Supplier</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              {data.po.suppliers?.name || "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Order Date</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              {data.po.order_date
                ? new Date(data.po.order_date).toLocaleDateString()
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Expected Delivery</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              {data.po.expected_delivery_date
                ? new Date(data.po.expected_delivery_date).toLocaleDateString()
                : "—"}
            </div>
          </div>
        </div>
      </div>

      <ReceiveInventoryForm
        poId={poId}
        lineItems={data.lineItems}
        stores={data.stores}
      />
    </div>
  )
}

export default async function ReceiveInventoryPage({
  params,
}: {
  params: Promise<{ po_id: string }>
}) {
  const { po_id } = await params
  return (
    <Suspense fallback={<LoadingState />}>
      <ReceiveInventoryContent poId={po_id} />
    </Suspense>
  )
}
