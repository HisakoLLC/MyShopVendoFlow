import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { SalesReportClient } from "./sales-report-client"

type SaleRow = {
  sale_id: string
  receipt_number: string | null
  sale_date: string | null
  grand_total: number | null
  payment_method: string | null
  store_id: string | null
  cashier_id: string | null
  customer_id: string | null
  notes: string | null
  stores: { name: string } | null
  staff: { first_name: string | null; last_name: string | null } | null
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null
}

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

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] : accountIdRaw
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

  // Default: last 7 days as a rolling window (so "today" sales are always included)
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fromStr = sevenDaysAgo.toISOString()
  const toStr = now.toISOString()

  const storeIds = stores?.map((s: { store_id: string }) => s.store_id) || []

  let initialSales: SaleRow[] = []
  if (storeIds.length > 0) {
    const result = await supabase
      .from("sales")
      .select(
        "sale_id, receipt_number, sale_date, grand_total, payment_method, store_id, cashier_id, customer_id, notes, stores(name), staff(first_name, last_name), customers(first_name, last_name, phone)"
      )
      .in("store_id", storeIds)
      .gte("sale_date", fromStr)
      .lte("sale_date", toStr)
      .order("sale_date", { ascending: false })
      .limit(100)
    initialSales = result.data ?? []
    if (result.error) {
      console.error("Sales fetch error:", result.error)
    }
  }

  // Get line items count and quantities for each sale
  const saleIds = initialSales.map((s: { sale_id: string }) => s.sale_id)
  let lineItems: Array<{ sale_id: string | null; quantity: number | null }> | null = null
  if (saleIds.length > 0) {
    const result = await supabase
      .from("sale_line_items")
      .select("sale_id, quantity")
      .in("sale_id", saleIds)
    lineItems = result.data
  } else {
    lineItems = []
  }

  const itemsPerSale = (lineItems || []).reduce((acc: Record<string, number>, item: { sale_id: string | null; quantity: number | null }) => {
    if (item.sale_id) {
      acc[item.sale_id] = (acc[item.sale_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const initialTotalUnits = (lineItems || []).reduce((sum: number, item: { sale_id: string | null; quantity: number | null }) => sum + (item.quantity || 0), 0)

  return (
    <SalesReportClient
      initialSales={initialSales}
      itemsPerSale={itemsPerSale}
      initialTotalUnits={initialTotalUnits}
      stores={stores || []}
      staff={staff || []}
      defaultDateRange={{
        from: sevenDaysAgo.toISOString().split("T")[0],
        to: now.toISOString().split("T")[0],
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
