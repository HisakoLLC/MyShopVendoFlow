import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { InventoryIntelligenceClient } from "./intelligence-client"

export const dynamic = "force-dynamic"

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading intelligence data...</p>
      </div>
    </div>
  )
}

async function IntelligenceContent() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId =
    accountIdRaw != null
      ? (Array.isArray(accountIdRaw) ? accountIdRaw[0] ?? accountIdRaw : accountIdRaw)
      : null
  const accountIdStr = accountId != null ? String(accountId) : null
  if (accountIdError || !accountIdStr) {
    redirect("/onboarding?redirect=/inventory/intelligence")
  }

  // Fetch variant metrics with related data
  // First get all variants for this account
  const { data: accountVariants, error: variantsError } = await supabase
    .from("product_variants")
    .select("variant_id, product_styles!inner(account_id)")
    .eq("product_styles.account_id", accountIdStr)

  const variantIds = (accountVariants || []).map((v: { variant_id: string }) => v.variant_id)

  // Fetch variant metrics for these variants
  const { data: variantMetrics, error: metricsError } = variantIds.length
    ? await supabase
        .from("variant_metrics")
        .select(
          "variant_id, sell_through_30d, sell_through_60d, sell_through_90d, avg_daily_sales_30d, days_of_inventory, restock_urgency_score, stock_health, product_variants(size, color, sku, price, cost, style_id, product_styles(name, image_url))"
        )
        .in("variant_id", variantIds)
        .order("variant_id", { ascending: true })
    : { data: [], error: null }

  if (metricsError) {
    console.error("Error fetching variant metrics:", metricsError)
  }

  // Fetch inventory levels (aggregated across all stores)
  // RLS will filter by account automatically
  const { data: inventoryLevels, error: inventoryError } = variantIds.length
    ? await supabase
        .from("inventory_levels")
        .select("variant_id, quantity_on_hand")
        .in("variant_id", variantIds)
    : { data: [], error: null }

  if (inventoryError) {
    console.error("Error fetching inventory levels:", inventoryError)
  }

  // Aggregate inventory by variant
  const inventoryByVariant = (inventoryLevels || []).reduce((acc: Record<string, number>, item: { variant_id: string; quantity_on_hand: number | null }) => {
    if (item.variant_id) {
      acc[item.variant_id] = (acc[item.variant_id] || 0) + (item.quantity_on_hand || 0)
    }
    return acc
  }, {} as Record<string, number>)

  // Fetch all product styles for heatmap
  const { data: productStyles, error: stylesError } = await supabase
    .from("product_styles")
    .select("style_id, name, image_url")
    .eq("account_id", accountIdStr)
    .eq("archived", false)
    .order("name", { ascending: true })

  if (stylesError) {
    console.error("Error fetching product styles:", stylesError)
  }

  return (
    <InventoryIntelligenceClient
      variantMetrics={variantMetrics || []}
      inventoryByVariant={inventoryByVariant}
      productStyles={productStyles || []}
    />
  )
}

export default function InventoryIntelligencePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <IntelligenceContent />
    </Suspense>
  )
}
