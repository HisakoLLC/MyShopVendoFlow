"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { signStorageUrls } from "@/app/purchasing/actions"
import { CreatePOForm } from "./create-po-form"

const RESTOCK_ITEMS_KEY = "purchasing_new_restock_items"

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

type RestockFromStorageLoaderProps = {
  suppliers: Supplier[]
}

const LOAD_TIMEOUT_MS = 35_000
const VARIANT_FETCH_CHUNK_SIZE = 80

export function RestockFromStorageLoader({ suppliers }: RestockFromStorageLoaderProps) {
  const [prefillItems, setPrefillItems] = React.useState<PrefillItem[]>([])
  const [prefillVariants, setPrefillVariants] = React.useState<Variant[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [timeoutMessage, setTimeoutMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof sessionStorage === "undefined") {
      setLoading(false)
      return
    }

    const raw = sessionStorage.getItem(RESTOCK_ITEMS_KEY)
    sessionStorage.removeItem(RESTOCK_ITEMS_KEY)

    if (!raw) {
      setLoading(false)
      return
    }

    let items: PrefillItem[]
    try {
      items = JSON.parse(raw) as PrefillItem[]
    } catch {
      setError("Invalid restock data.")
      setLoading(false)
      return
    }

    if (!Array.isArray(items) || items.length === 0) {
      setLoading(false)
      return
    }

    const variantIds = items.map((item) => item.variant_id)
    const supabase = createClient()
    let settled = false

    const done = () => {
      if (!settled) {
        settled = true
        setLoading(false)
      }
    }

    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true
        setTimeoutMessage("Loading took too long. You can add items manually below.")
        setLoading(false)
      }
    }, LOAD_TIMEOUT_MS)

    const selectVariantFields = `
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

    function fetchVariantsChunk(ids: string[], accountId: string): Promise<Variant[]> {
      return supabase
        .from("product_variants")
        .select(selectVariantFields)
        .in("variant_id", ids)
        .eq("product_styles.account_id", accountId)
        .then(({ data, error: e }: { data: Variant[] | null; error: { message: string } | null }) => {
          if (e) throw new Error(e.message)
          return (data || []) as Variant[]
        })
    }

    supabase
      .rpc("get_account_id")
      .then(({ data: accountIdRaw }: { data: string | string[] | { account_id: string } | null }) => {
        const accountId = Array.isArray(accountIdRaw)
          ? accountIdRaw[0]
          : typeof accountIdRaw === "object" &&
              accountIdRaw !== null &&
              "account_id" in accountIdRaw
            ? (accountIdRaw as { account_id: string }).account_id
            : accountIdRaw
        if (!accountId) {
          done()
          return
        }
        const chunks: string[][] = []
        for (let i = 0; i < variantIds.length; i += VARIANT_FETCH_CHUNK_SIZE) {
          chunks.push(variantIds.slice(i, i + VARIANT_FETCH_CHUNK_SIZE))
        }
        return Promise.all(chunks.map((chunk) => fetchVariantsChunk(chunk, accountId))).then(
          async (results) => {
            const allVariants = results.flat()
            const urls = allVariants.map((v) => v.product_styles?.image_url ?? null)
            const signed = await signStorageUrls(urls)
            const withSigned = allVariants.map((v, i) => ({
              ...v,
              product_styles: v.product_styles
                ? { ...v.product_styles, image_url: signed[i] ?? v.product_styles.image_url }
                : null,
            }))
            setPrefillItems(items)
            setPrefillVariants(withSigned)
          }
        )
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load restock items.")
      })
      .finally(() => {
        window.clearTimeout(timeoutId)
        done()
      })

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          <div className="text-base font-semibold">Couldn&apos;t load restock items</div>
          <div className="mt-1 text-sm opacity-90">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {timeoutMessage && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-sm">{timeoutMessage}</p>
        </div>
      )}
      {prefillItems.length > 0 && (
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
    </>
  )
}
