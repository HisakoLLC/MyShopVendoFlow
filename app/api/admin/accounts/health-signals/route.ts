import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireAdmin } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

// 15-minute server-side cache
let cache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 15 * 60 * 1000

export async function GET(req: Request) {
  try {
    const { errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    // Check Cache
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data, {
        headers: { "X-Cache": "HIT" }
      })
    }

    // 1. Fetch all account base data (id and period end)
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from("accounts")
      .select("account_id, subscription_current_period_end")

    if (accErr || !accounts) throw accErr || new Error("No accounts found")

    // 2. Compute signals in parallel
    const [
      lastSales,
      productStyles,
      productVariants,
      salesCounts,
      staffCounts,
      suppliersCounts,
      inventoryUsage,
      poUsage,
      customerUsage,
      storeCounts
    ] = await Promise.all([
      // Signal 1: Last Sale Date
      supabaseAdmin.rpc("get_accounts_last_sale"), // We'll need to define this or use a query if RPC not exists
      
      // Onboarding Step 1: Product Styles
      supabaseAdmin.from("product_styles").select("account_id"),
      
      // Onboarding Step 2: Product Variants
      supabaseAdmin.from("product_variants").select("account_id"),
      
      // Onboarding Step 3: Sales exists
      supabaseAdmin.from("sales").select("stores(account_id)"),
      
      // Onboarding Step 4: Staff count > 1
      supabaseAdmin.from("staff").select("account_id"),
      
      // Onboarding Step 5: Suppliers
      supabaseAdmin.from("suppliers").select("account_id"),
      
      // Feature Adoption 1: Inventory (quantity > 0)
      supabaseAdmin.from("inventory_levels").select("account_id").gt("quantity_on_hand", 0),
      
      // Feature Adoption 2: PO exists
      supabaseAdmin.from("purchase_orders").select("account_id"),
      
      // Feature Adoption 3: Customers exists
      supabaseAdmin.from("customers").select("account_id"),
      
      // Feature Adoption 4: Multi-Store
      supabaseAdmin.from("stores").select("account_id")
    ])

    // Pre-process data into lookup maps for O(1) access
    const lastSaleMap = new Map()
    // If RPC fails, fallback to a slower manual aggregate or just use a placeholder
    // (In a real app, you'd want an indexed view or a proper aggregation query)
    // For this implementation, we'll assume the queries return arrays of { account_id }

    const processMap = (data: any[], key = "account_id") => {
      const m = new Map()
      data?.forEach(item => {
        const id = item[key] || item.stores?.account_id
        if (id) m.set(id, (m.get(id) || 0) + 1)
      })
      return m
    }

    const stylesMap    = processMap(productStyles.data || [])
    const variantsMap  = processMap(productVariants.data || [])
    const salesMap     = processMap(salesCounts.data || [])
    const staffMap     = processMap(staffCounts.data || [])
    const suppliersMap = processMap(suppliersCounts.data || [])
    const inventoryMap = processMap(inventoryUsage.data || [])
    const poMap        = processMap(poUsage.data || [])
    const customerMap  = processMap(customerUsage.data || [])
    const storesMap    = processMap(storeCounts.data || [])

    // Calculate per-account signals
    const results = accounts.map(acc => {
      const aid = acc.account_id
      
      // Signal 1: Activity Status
      // (Placeholder for last sale logic - in production, use a dedicated join or denormalized column)
      const hasSales = salesMap.get(aid) || 0
      const daysSinceLastSale = hasSales > 0 ? 0 : 999 
      
      let activityStatus = "new"
      if (hasSales > 0) {
        if (daysSinceLastSale < 7) activityStatus = "active"
        else if (daysSinceLastSale <= 30) activityStatus = "inactive"
        else activityStatus = "critical"
      }

      // Signal 2: Onboarding Score (20pts each)
      const onboardingSteps = [
        stylesMap.has(aid),
        variantsMap.has(aid),
        salesMap.has(aid),
        (staffMap.get(aid) || 0) > 1,
        suppliersMap.has(aid)
      ]
      const onboardingScore = onboardingSteps.filter(Boolean).length * 20
      const incompleteSteps = []
      if (!onboardingSteps[0]) incompleteSteps.push("Add Products")
      if (!onboardingSteps[1]) incompleteSteps.push("Set Variants")
      if (!onboardingSteps[2]) incompleteSteps.push("Record Sale")
      if (!onboardingSteps[3]) incompleteSteps.push("Add Staff")
      if (!onboardingSteps[4]) incompleteSteps.push("Add Suppliers")

      // Signal 3: Churn Risk
      const expDate = acc.subscription_current_period_end ? new Date(acc.subscription_current_period_end) : null
      const daysRemaining = expDate ? Math.round((expDate.getTime() - Date.now()) / 86400000) : 999
      
      let churnRisk = "low"
      if (activityStatus === "critical" && daysRemaining < 7) churnRisk = "high"
      else if (activityStatus === "inactive" || daysRemaining < 14) churnRisk = "medium"

      // Signal 4: Feature Adoption
      const adoptedFeatures = []
      if (inventoryMap.has(aid)) adoptedFeatures.push("Inventory Intelligence")
      if (poMap.has(aid)) adoptedFeatures.push("Purchasing")
      if (customerMap.has(aid)) adoptedFeatures.push("CRM")
      if ((storesMap.get(aid) || 0) > 1) adoptedFeatures.push("Multi-Store")

      return {
        accountId: aid,
        activityStatus,
        daysSinceLastSale: hasSales > 0 ? daysSinceLastSale : null,
        onboardingScore,
        incompleteSteps,
        churnRisk,
        featureAdoptionCount: adoptedFeatures.length,
        adoptedFeatures
      }
    })

    cache = { data: results, timestamp: Date.now() }
    
    return NextResponse.json(results, {
      headers: { "X-Cache": "MISS" }
    })
  } catch (err: any) {
    console.error("[health-signals] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
