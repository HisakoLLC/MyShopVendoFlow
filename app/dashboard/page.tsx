import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { ensureAccountForCurrentUser } from "@/app/onboarding/actions"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics"
import { RecentSales } from "@/components/dashboard/RecentSales"
import { RetryButton } from "@/components/dashboard/RetryButton"
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { Plus, Box, ShoppingBag, Users, AlertTriangle } from "lucide-react"

function DashboardErrorCard({
  title = "Something went wrong",
  description = "The dashboard could not load. This often happens when the database still needs permission setup for your account and dashboard tables.",
  detail,
  showSqlHint = true,
}: {
  title?: string
  description?: string
  detail?: string
  showSqlHint?: boolean
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
          {detail && (
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-2 break-all">
              {detail}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showSqlHint && (
            <div className="rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
              <p className="font-medium mb-2">Fix it in Supabase (run in SQL Editor in this order):</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                <li><code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">sql/AUTO_CREATE_ACCOUNT_ON_SIGNUP.sql</code></li>
                <li><code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">sql/FIX_ALL_RLS_ISSUES.sql</code></li>
                <li><code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">sql/FIX_DASHBOARD_ACCESS.sql</code></li>
                <li><code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">sql/FIX_PRODUCTS_PAGE_ACCESS.sql</code></li>
                <li><code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">sql/FIX_INVENTORY_AND_SETTINGS_ACCESS.sql</code></li>
              </ol>
              <p className="mt-2 text-xs text-zinc-500">
                Confirm your app uses the <strong>same Supabase project</strong> where you ran the SQL (check Vercel env: NEXT_PUBLIC_SUPABASE_URL).
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <RetryButton />
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function DashboardContent() {
  let supabase
  try {
    supabase = await createServerSupabaseClient()
  } catch (error) {
    console.error("Error initializing Supabase client:", error)
    redirect("/login")
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      redirect("/login")
    }

    let accountId: string | null = null
    try {
      const res = await supabase.rpc("get_account_id")
      accountId = res.data ?? null
      // If no account (e.g. trigger not installed or old user), create one automatically
      if (res.error || !accountId) {
        const ensured = await ensureAccountForCurrentUser()
        if (ensured.success) {
          accountId = ensured.accountId
        } else {
          redirect("/onboarding?redirect=/dashboard")
        }
      }
      if (!accountId) {
        redirect("/onboarding?redirect=/dashboard")
      }
    } catch (rpcErr: unknown) {
      const d = rpcErr && typeof rpcErr === "object" && (rpcErr as { digest?: string }).digest
      if (typeof d === "string" && d.includes("NEXT_REDIRECT")) {
        throw rpcErr
      }
      const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
      console.error("get_account_id failed:", rpcErr)
      return (
        <DashboardErrorCard
          description="Account lookup failed. Run the SQL files in Supabase (same project as your app)."
          detail={msg}
        />
      )
    }

    // Get all stores for this account
    const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("account_id", accountId)

    // Handle RLS/permission errors gracefully - never throw so Next.js doesn't show generic error
    if (storesError) {
      return (
        <DashboardErrorCard
          title="Database configuration required"
          description="Stores could not be loaded. Run the SQL files in Supabase (same project as your app)."
          detail={storesError.message}
        />
      )
    }

  const storeIds = stores?.map((s: { store_id: string }) => s.store_id) || []

  // If no stores exist, show a helpful message
  if (storeIds.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Stores Found</CardTitle>
            <CardDescription>
              You need to create at least one store before viewing the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              The dashboard requires stores to display sales metrics and inventory data.
            </p>
            <Button asChild className="w-full">
              <Link href="/onboarding">Go to Onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch has_demo_data for "Delete demo data" button
  let hasDemoData = false
  try {
    const { data: accountRow } = await supabase
      .from("accounts")
      .select("has_demo_data")
      .eq("account_id", accountId)
      .single()
    hasDemoData = !!accountRow?.has_demo_data
  } catch {
    // Column may not exist or RLS may block; show button only when we know we have demo data
  }

  // Get today and yesterday dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split("T")[0]
  const yesterdayStr = yesterday.toISOString().split("T")[0]

  // Fetch today's and yesterday's metrics - wrap in try so permission errors don't crash the page
  let todayRevenue = 0
  let todayTransactions = 0
  let todayUnitsSold = 0
  let yesterdayRevenue = 0
  let yesterdayTransactions = 0
  let revenueChange = 0
  let transactionChange = 0

  try {
    const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const { data: todaySales } = await supabase
      .from("sales")
      .select("grand_total, sale_id, sale_date")
      .in("store_id", storeIds)
      .gte("sale_date", todayStr)
      .lt("sale_date", tomorrowStr)

    const { data: todayLineItems } = await supabase
      .from("sale_line_items")
      .select("quantity, sale_id, sales!inner(store_id, sale_date)")
      .in("sales.store_id", storeIds)
      .gte("sales.sale_date", todayStr)
      .lt("sales.sale_date", tomorrowStr)

    const { data: yesterdaySales } = await supabase
      .from("sales")
      .select("grand_total, sale_id")
      .in("store_id", storeIds)
      .gte("sale_date", yesterdayStr)
      .lt("sale_date", todayStr)

    const { data: yesterdayLineItems } = await supabase
      .from("sale_line_items")
      .select("quantity, sale_id, sales!inner(store_id, sale_date)")
      .in("sales.store_id", storeIds)
      .gte("sales.sale_date", yesterdayStr)
      .lt("sales.sale_date", todayStr)

    todayRevenue = (todaySales || []).reduce((sum: number, s: { grand_total: number | null }) => sum + (s.grand_total || 0), 0)
    todayTransactions = (todaySales || []).length
    todayUnitsSold = (todayLineItems || []).reduce((sum: number, item: { quantity: number | null }) => sum + (item.quantity || 0), 0)
    yesterdayRevenue = (yesterdaySales || []).reduce((sum: number, s: { grand_total: number | null }) => sum + (s.grand_total || 0), 0)
    yesterdayTransactions = (yesterdaySales || []).length
    revenueChange =
      yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
    transactionChange = yesterdayTransactions > 0 ? todayTransactions - yesterdayTransactions : 0
  } catch {
    // sales/sale_line_items permission or RLS failure; show zeros and friendly card hint below
  }

  // Fetch low stock count (variants with days_of_inventory < 7) - non-fatal
  let lowStockCount = 0
  try {
    const { data: lowStockVariants } = await supabase
      .from("variant_metrics")
      .select("variant_id, days_of_inventory")
      .lt("days_of_inventory", 7)
      .not("days_of_inventory", "is", null)
    lowStockCount = (lowStockVariants || []).length
  } catch {
    // variant_metrics may be missing or restricted; show 0
  }

  // Fetch last 7 days sales data
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]

  // Try to use daily_sales_metrics first, fallback to aggregating sales - non-fatal
  let salesChartData: Array<{ date: string; revenue: number }> = []
  try {
    const { data: dailyMetrics } = await supabase
      .from("daily_sales_metrics")
      .select("date, total_revenue")
      .in("store_id", storeIds)
      .gte("date", sevenDaysAgoStr)
      .lte("date", todayStr)
      .order("date", { ascending: true })

    if (dailyMetrics && dailyMetrics.length > 0) {
      salesChartData = dailyMetrics.map((m: { date: string; total_revenue: number | null }): { date: string; revenue: number } => ({
        date: new Date(m.date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
        revenue: m.total_revenue ?? 0,
      }))
    } else {
      const { data: salesData, error: salesDataError } = await supabase
        .from("sales")
        .select("sale_date, grand_total")
        .in("store_id", storeIds)
        .gte("sale_date", sevenDaysAgoStr)
        .lte("sale_date", todayStr)

      if (!salesDataError && salesData) {
        const grouped = salesData.reduce((acc: Record<string, number>, sale: { sale_date: string | null; grand_total: number | null }) => {
          const date = sale.sale_date?.split("T")[0] || ""
          if (!acc[date]) {
            acc[date] = 0
          }
          acc[date] += sale.grand_total || 0
          return acc
        }, {} as Record<string, number>)

        salesChartData = Object.entries(grouped)
          .map(([date, revenue]) => ({
            date: new Date(date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
            revenue: revenue as number,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }
    }
  } catch {
    // daily_sales_metrics or sales aggregate may fail; keep empty chart
  }

  // Fetch top sellers (last 7 days) - non-fatal (needs product_styles/product_variants)
  let topSellers: Array<{ name: string; revenue: number }> = []
  try {
    const { data: salesInRange } = await supabase
      .from("sales")
      .select("sale_id")
      .in("store_id", storeIds)
      .gte("sale_date", sevenDaysAgoStr)
      .lte("sale_date", todayStr)

    const saleIdsInRange = (salesInRange || []).map((s: { sale_id: string }) => s.sale_id)

    const { data: topSellersData } = saleIdsInRange.length
      ? await supabase
          .from("sale_line_items")
          .select(
            "line_total, variant_id, product_variants!inner(style_id, product_styles!inner(style_id, name))"
          )
          .in("sale_id", saleIdsInRange)
      : { data: [] }

    const topSellersMap = new Map<string, { name: string; revenue: number }>()
    if (topSellersData) {
      topSellersData.forEach((item: { line_total: number | null; product_variants: { product_styles: { style_id: string; name: string } | null } | null }) => {
        const style = item.product_variants?.product_styles as { style_id?: string; name?: string } | null
        if (style?.style_id && style?.name) {
          const current = topSellersMap.get(style.style_id) || { name: style.name, revenue: 0 }
          current.revenue += item.line_total || 0
          topSellersMap.set(style.style_id, current)
        }
      })
    }

    topSellers = Array.from(topSellersMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  } catch {
    // product_styles/product_variants permissions or missing tables; show empty list
  }

  // Fetch recent sales with customer name - non-fatal
  type SaleRow = {
    sale_id: string
    receipt_number: string | null
    grand_total: number | null
    payment_method: string | null
    sale_date: string | null
    store_id: string | null
    customers?: { first_name: string | null; last_name: string | null } | null
  }
  let recentSales: Array<{
    sale_id: string
    receipt_number: string | null
    grand_total: number | null
    payment_method: string | null
    sale_date: string | null
    store_id: string | null
    customer_name?: string | null
  }> = []
  let itemsPerSale: Record<string, number> = {}
  try {
    const { data: recentSalesData } = await supabase
      .from("sales")
      .select("sale_id, receipt_number, grand_total, payment_method, sale_date, store_id, customers(first_name, last_name)")
      .in("store_id", storeIds)
      .order("sale_date", { ascending: false })
      .limit(10)

    const raw = (recentSalesData || []) as SaleRow[]
    recentSales = raw.map((s) => {
      const name =
        s.customers?.first_name || s.customers?.last_name
          ? [s.customers?.first_name, s.customers?.last_name].filter(Boolean).join(" ")
          : null
      return {
        sale_id: s.sale_id,
        receipt_number: s.receipt_number,
        grand_total: s.grand_total,
        payment_method: s.payment_method,
        sale_date: s.sale_date,
        store_id: s.store_id,
        customer_name: name ?? null,
      }
    })

    const recentSaleIds = recentSales.map((s: { sale_id: string }) => s.sale_id)
    let recentLineItems: Array<{ sale_id: string | null }> | null = []
    if (recentSaleIds.length > 0) {
      const result = await supabase
        .from("sale_line_items")
        .select("sale_id")
        .in("sale_id", recentSaleIds)
      recentLineItems = result.data
    }

    itemsPerSale = (recentLineItems || []).reduce((acc: Record<string, number>, item: { sale_id: string | null }) => {
      if (item.sale_id) {
        acc[item.sale_id] = (acc[item.sale_id] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
  } catch {
    // recent sales or line items may fail; show empty list
  }

  const dateLabel = today.toLocaleDateString("en-KE", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const yesterdayFormatted = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(yesterdayRevenue)

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 dark:bg-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Dashboard
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Welcome back! Here&apos;s what&apos;s happening today.
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
              {dateLabel}
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700">
            <Link href="/pos" className="gap-2">
              <Plus className="h-5 w-5" />
              New Sale
            </Link>
          </Button>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            variant="revenue"
            value={todayRevenue}
            label="Today's Revenue"
            trend={yesterdayRevenue > 0 ? `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%` : undefined}
            trendUp={revenueChange >= 0}
            comparison={`${yesterdayFormatted} yesterday`}
            formatAsCurrency
          />
          <DashboardStatCard
            variant="transactions"
            value={todayTransactions}
            label="Transactions"
            trend={transactionChange !== 0 ? `${transactionChange >= 0 ? "+" : ""}${transactionChange}` : undefined}
            trendUp={transactionChange >= 0}
            comparison={yesterdayTransactions > 0 ? `${yesterdayTransactions} yesterday` : undefined}
          />
          <DashboardStatCard
            variant="units"
            value={todayUnitsSold}
            label="Units Sold"
            comparison="Items sold today"
          />
          <DashboardStatCard
            variant="alerts"
            value={lowStockCount}
            label="Low Stock Items"
            href="/inventory/intelligence"
            alertBorder={lowStockCount > 5}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Sales Overview
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Last 7 days
            </p>
            <div className="mt-4">
              <DashboardCharts salesData={salesChartData} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Top 5 Products
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              By revenue, last 7 days
            </p>
            <div className="mt-4">
              <DashboardMetrics topSellers={topSellers} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/inventory/intelligence?tab=deadstock"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80"
          >
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Box className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              View Dead Stock
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Identify slow-moving inventory
            </p>
          </Link>
          <Link
            href="/purchasing/restock"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80"
          >
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Restock Suggestions
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Reorder based on demand
            </p>
          </Link>
          <Link
            href="/customers?sort=total_spend"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80"
          >
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-100 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400">
              <Users className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Top Customers
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              By total spend
            </p>
          </Link>
        </div>

        {/* Recent Sales */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Recent Sales
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <RecentSales sales={recentSales} itemsPerSale={itemsPerSale} />
          </div>
        </section>
      </div>
    </div>
  )
  } catch (err: unknown) {
    const digest = err && typeof err === "object" && (err as { digest?: string }).digest
    if (typeof digest === "string" && digest.includes("NEXT_REDIRECT")) {
      throw err
    }
    console.error("Dashboard error:", err)
    return (
      <DashboardErrorCard
        description="The dashboard could not load. In Supabase SQL Editor run sql/FIX_ALL_RLS_ISSUES.sql then sql/FIX_DASHBOARD_ACCESS.sql and try again."
      />
    )
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
