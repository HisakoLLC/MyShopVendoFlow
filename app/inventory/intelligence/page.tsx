import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { InventoryIntelligenceClient } from "./intelligence-client"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-sm border-2 border-zinc-800 border-t-zinc-100 mx-auto"></div>
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Loading Intelligence Data...</p>
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
    <div className="min-h-screen bg-zinc-950 px-8 py-8">
      <Link 
        href="/inventory" 
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-100 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to inventory
      </Link>

      <div className="flex items-start justify-between border-b border-zinc-800 pb-6 mb-6">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
            AI-POWERED INSIGHTS, STOCK HEALTH, AND SALES VELOCITY
          </p>
          <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
            Inventory Intelligence
          </h1>
        </div>
      </div>

      <InventoryIntelligenceClient
        variantMetrics={variantMetrics || []}
        inventoryByVariant={inventoryByVariant}
        productStyles={productStyles || []}
      />
    </div>
  )
}

export default function InventoryIntelligencePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <IntelligenceContent />
    </Suspense>
  )
}
