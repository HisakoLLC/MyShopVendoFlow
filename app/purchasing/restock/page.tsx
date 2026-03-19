import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
import { RestockSuggestionsClient } from "./restock-suggestions-client"

export const dynamic = "force-dynamic"

type VariantMetricRow = {
  variant_id: string
  days_of_inventory: number | null
  restock_urgency_score: number | null
  avg_daily_sales_30d: number | null
  product_variants: {
    size: string
    color: string
    sku: string
    cost: number | null
    style_id: string
    product_styles: {
      name: string
      image_url: string | null
    } | null
  } | null
}

type RestockSuggestion = {
  variant_id: string
  style_id: string
  style_name: string
  style_image_url: string | null
  size: string
  color: string
  sku: string
  current_stock: number
  avg_daily_sales_30d: number
  days_remaining: number
  suggested_qty: number
  unit_cost: number
  line_total: number
  restock_urgency_score: number
}

async function fetchRestockSuggestions(): Promise<RestockSuggestion[]> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] : accountIdRaw
  if (accountIdError || !accountId) {
    redirect("/onboarding?redirect=/purchasing/restock")
  }

  // First, get all variants for this account
  const { data: accountVariants, error: variantsError } = await supabase
    .from("product_variants")
    .select("variant_id, product_styles!inner(account_id)")
    .eq("product_styles.account_id", accountId)

  if (variantsError) {
    throw new Error(variantsError.message)
  }

  const variantIds = (accountVariants || []).map((v: { variant_id: string }) => v.variant_id)
  if (variantIds.length === 0) {
    return []
  }

  // Fetch variant metrics with days_of_inventory < 7, sorted by urgency
  const { data: variantMetrics, error: metricsError } = await supabase
    .from("variant_metrics")
    .select(
      `
      variant_id,
      days_of_inventory,
      restock_urgency_score,
      avg_daily_sales_30d,
      product_variants!inner(
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
      )
    `
    )
    .in("variant_id", variantIds)
    .eq("product_variants.product_styles.account_id", accountId)
    .lt("days_of_inventory", 7)
    .not("days_of_inventory", "is", null)
    .order("restock_urgency_score", { ascending: false, nullsFirst: false })

  if (metricsError) {
    throw new Error(metricsError.message)
  }

  // Fetch inventory levels (aggregated across all stores)
  const { data: inventoryLevels, error: inventoryError } = await supabase
    .from("inventory_levels")
    .select("variant_id, quantity_on_hand")
    .in("variant_id", variantIds)

  if (inventoryError) {
    throw new Error(inventoryError.message)
  }

  // Aggregate inventory by variant
  const inventoryByVariant = (inventoryLevels || []).reduce((acc: Record<string, number>, item: { variant_id: string | null; quantity_on_hand: number | null }) => {
    if (item.variant_id) {
      acc[item.variant_id] = (acc[item.variant_id] || 0) + (item.quantity_on_hand || 0)
    }
    return acc
  }, {} as Record<string, number>)

  // Transform velocity-based data into restock suggestions (days_of_inventory < 7)
  const velocitySuggestions: RestockSuggestion[] = (variantMetrics || [])
    .map((metric: VariantMetricRow) => {
      const variant = metric.product_variants
      if (!variant || !variant.product_styles) {
        return null
      }

      const currentStock = inventoryByVariant[metric.variant_id] || 0
      const avgDailySales = metric.avg_daily_sales_30d || 0
      const daysRemaining = metric.days_of_inventory || 0
      const unitCost = variant.cost || 0

      // Suggested qty: 30 × avg_daily_sales - current_stock, min 1
      const suggestedQty = Math.max(1, Math.ceil(30 * avgDailySales - currentStock))
      const lineTotal = suggestedQty * unitCost

      return {
        variant_id: metric.variant_id,
        style_id: variant.style_id,
        style_name: variant.product_styles.name,
        style_image_url: variant.product_styles.image_url,
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
        current_stock: currentStock,
        avg_daily_sales_30d: avgDailySales,
        days_remaining: daysRemaining,
        suggested_qty: suggestedQty,
        unit_cost: unitCost,
        line_total: lineTotal,
        restock_urgency_score: metric.restock_urgency_score || 0,
      }
    })
    .filter((s: RestockSuggestion | null): s is RestockSuggestion => s !== null)

  const velocityVariantIds = new Set(velocitySuggestions.map((s) => s.variant_id))

  // Include out-of-stock variants that are NOT in variant_metrics (or have null days_of_inventory)
  const outOfStockVariantIds = variantIds.filter(
    (id: string) => (inventoryByVariant[id] ?? 0) <= 0 && !velocityVariantIds.has(id)
  )

  if (outOfStockVariantIds.length > 0) {
    const { data: outOfStockVariants, error: outOfStockError } = await supabase
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
      .in("variant_id", outOfStockVariantIds)
      .eq("product_styles.account_id", accountId)

    if (!outOfStockError && outOfStockVariants?.length) {
      for (const row of outOfStockVariants) {
        const pv = row as {
          variant_id: string
          size: string
          color: string
          sku: string
          cost: number | null
          style_id: string
          product_styles: { name: string; image_url: string | null } | null
        }
        const style = pv.product_styles
        if (!style) continue

        const currentStock = inventoryByVariant[pv.variant_id] ?? 0
        const unitCost = pv.cost ?? 0
        const suggestedQty = Math.max(1, 5) // default min restock for out-of-stock

        velocitySuggestions.push({
          variant_id: pv.variant_id,
          style_id: pv.style_id,
          style_name: style.name,
          style_image_url: style.image_url,
          size: pv.size,
          color: pv.color,
          sku: pv.sku,
          current_stock: currentStock,
          avg_daily_sales_30d: 0,
          days_remaining: 0,
          suggested_qty: suggestedQty,
          unit_cost: unitCost,
          line_total: suggestedQty * unitCost,
          restock_urgency_score: 100, // highest urgency for out-of-stock
        })
      }
    }
  }

  // Sort by urgency (out-of-stock and lowest days first)
  const suggestions = velocitySuggestions.sort(
    (a, b) => b.restock_urgency_score - a.restock_urgency_score
  )

  return suggestions
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-4 h-20 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn't load restock suggestions</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function RestockSuggestionsContent() {
  let suggestions: RestockSuggestion[]
  let currency = "KES"
  try {
    suggestions = await fetchRestockSuggestions()
    const supabase = await createServerSupabaseClient()
    const { data: accountIdRaw } = await supabase.rpc("get_account_id")
    const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] : accountIdRaw
    if (accountId) {
      const { data: bs } = await supabase.from("business_settings").select("currency").eq("account_id", accountId).single()
      currency = (bs as { currency?: string } | null)?.currency ?? "KES"
    }

    // Sign Supabase storage URLs so images load for private buckets
    const suggestionsWithSignedUrls = await Promise.all(
      suggestions.map(async (s) => ({
        ...s,
        style_image_url: s.style_image_url
          ? await getSignedStorageUrl(supabase, s.style_image_url)
          : null,
      }))
    )
    suggestions = suggestionsWithSignedUrls
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load restock suggestions."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6">
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
          Variants that need restocking based on sales velocity
        </p>
        <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
          Restock Suggestions
        </h1>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
        <p className="text-sm">
          These variants are running low based on sales velocity. Create a purchase order to
          restock.
        </p>
      </div>

      <RestockSuggestionsClient suggestions={suggestions} currency={currency} />
    </div>
  )
}

export default function RestockSuggestionsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RestockSuggestionsContent />
    </Suspense>
  )
}
