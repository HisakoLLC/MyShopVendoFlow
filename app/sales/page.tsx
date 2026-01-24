import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { SalesReportClient } from "./sales-report-client"

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading sales report...</p>
      </div>
    </div>
  )
}

async function SalesReportContent() {
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
    redirect("/onboarding?redirect=/sales")
  }

  // Fetch stores for filter
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountId)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(`Failed to load stores: ${storesError.message}`)
  }

  // Fetch staff (cashiers) for filter
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("staff_id, first_name, last_name, email")
    .eq("account_id", accountId)
    .eq("active", true)
    .order("first_name", { ascending: true })

  if (staffError) {
    console.error("Error loading staff:", staffError)
  }

  // Default: Last 7 days
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const storeIds = stores?.map((s) => s.store_id) || []

  // Fetch initial sales data (last 7 days)
  const { data: initialSales, error: salesError } = await supabase
    .from("sales")
    .select(
      "sale_id, receipt_number, sale_date, grand_total, payment_method, store_id, cashier_id, customer_id, stores(name), staff(first_name, last_name), customers(first_name, last_name, phone)"
    )
    .in("store_id", storeIds)
    .gte("sale_date", `${sevenDaysAgo.toISOString().split("T")[0]}T00:00:00.000Z`)
    .lte("sale_date", `${today.toISOString().split("T")[0]}T23:59:59.999Z`)
    .order("sale_date", { ascending: false })
    .limit(100)

  // Get line items count and quantities for each sale
  const saleIds = (initialSales || []).map((s) => s.sale_id)
  const { data: lineItems } = saleIds.length
    ? await supabase
        .from("sale_line_items")
        .select("sale_id, quantity")
        .in("sale_id", saleIds)
    : { data: [], error: null }

  const itemsPerSale = (lineItems || []).reduce((acc, item) => {
    acc[item.sale_id] = (acc[item.sale_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const initialTotalUnits = (lineItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0)

  return (
    <SalesReportClient
      initialSales={initialSales || []}
      itemsPerSale={itemsPerSale}
      initialTotalUnits={initialTotalUnits}
      stores={stores || []}
      staff={staff || []}
      defaultDateRange={{
        from: sevenDaysAgo.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      }}
    />
  )
}

export default function SalesReportPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SalesReportContent />
    </Suspense>
  )
}
