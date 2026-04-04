import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireAdmin } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const { errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    // 1. Fetch account base data
    const { data: account, error: accErr } = await supabaseAdmin
      .from("accounts")
      .select("account_id, subscription_current_period_end")
      .eq("account_id", accountId)
      .single()

    if (accErr || !account) throw accErr || new Error("Account not found")

    // 2. Fetch specific signals for this account
    const [
      lastSaleResult,
      stylesCount,
      variantsCount,
      salesCount,
      staffCount,
      suppliersCount,
      inventoryCount,
      poCount,
      customersCount,
      storesCount
    ] = await Promise.all([
      // Signal 1: Last Sale
      supabaseAdmin
        .from("sales")
        .select("sale_date, stores!inner(account_id)")
        .eq("stores.account_id", accountId)
        .order("sale_date", { ascending: false })
        .limit(1),

      // Onboarding Step 1: Styles
      supabaseAdmin.from("product_styles").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      
      // Onboarding Step 2: Variants
      supabaseAdmin.from("product_variants").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      
      // Onboarding Step 3: Sales
      supabaseAdmin.from("sales").select("id", { count: "exact", head: true }).eq("stores.account_id", accountId),

      // Onboarding Step 4: Staff (beyond owner)
      supabaseAdmin.from("staff").select("id", { count: "exact", head: true }).eq("account_id", accountId),

      // Onboarding Step 5: Suppliers
      supabaseAdmin.from("suppliers").select("id", { count: "exact", head: true }).eq("account_id", accountId),

      // Adoption 1: Inventory
      supabaseAdmin.from("inventory_levels").select("id", { count: "exact", head: true }).eq("account_id", accountId).gt("quantity_on_hand", 0),

      // Adoption 2: POs
      supabaseAdmin.from("purchase_orders").select("id", { count: "exact", head: true }).eq("account_id", accountId),

      // Adoption 3: Customers
      supabaseAdmin.from("customers").select("id", { count: "exact", head: true }).eq("account_id", accountId),

      // Adoption 4: Multi-store
      supabaseAdmin.from("stores").select("id", { count: "exact", head: true }).eq("account_id", accountId)
    ])

    // Signal processing
    const lastSaleDate = lastSaleResult.data?.[0]?.sale_date
    const daysSinceLastSale = lastSaleDate 
      ? Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / 86400000)
      : null

    let activityStatus = "new"
    if (daysSinceLastSale !== null) {
      if (daysSinceLastSale < 7) activityStatus = "active"
      else if (daysSinceLastSale <= 30) activityStatus = "inactive"
      else activityStatus = "critical"
    }

    const onboardingSteps = [
      (stylesCount.count || 0) > 0,
      (variantsCount.count || 0) > 0,
      (salesCount.count || 0) > 0,
      (staffCount.count || 0) > 1,
      (suppliersCount.count || 0) > 0
    ]
    const onboardingScore = onboardingSteps.filter(Boolean).length * 20
    const incompleteSteps: string[] = []
    const stepNames = ["Add Products", "Configure Variants", "Complete a Sale", "Add More Staff", "Add Suppliers"]
    onboardingSteps.forEach((done, i) => { if (!done) incompleteSteps.push(stepNames[i]) })

    const expDate = account.subscription_current_period_end ? new Date(account.subscription_current_period_end) : null
    const daysRemaining = expDate ? Math.round((expDate.getTime() - Date.now()) / 86400000) : 999
    
    let churnRisk = "low"
    if (activityStatus === "critical" && daysRemaining < 7) churnRisk = "high"
    else if (activityStatus === "inactive" || daysRemaining < 14) churnRisk = "medium"

    const adoptedFeatures = []
    if ((inventoryCount.count || 0) > 0) adoptedFeatures.push("inventory")
    if ((poCount.count || 0) > 0) adoptedFeatures.push("purchasing")
    if ((customersCount.count || 0) > 0) adoptedFeatures.push("crm")
    if ((storesCount.count || 0) > 1) adoptedFeatures.push("multistore")

    return NextResponse.json({
      accountId,
      activityStatus,
      lastSaleDate,
      daysSinceLastSale,
      onboardingScore,
      incompleteSteps,
      churnRisk,
      adoptedFeatures,
      featureAdoptionCount: adoptedFeatures.length
    })

  } catch (err: any) {
    console.error("[health] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
