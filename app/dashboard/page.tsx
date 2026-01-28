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
import { WelcomeDemoBanner } from "@/components/dashboard/WelcomeDemoBanner"
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  AlertTriangle,
  Plus,
  Box,
  ShoppingBag,
} from "lucide-react"

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading dashboard...</p>
      </div>
    </div>
  )
}

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

  // Fetch recent sales - non-fatal
  let recentSales: Array<{ sale_id: string; receipt_number: string | null; grand_total: number | null; payment_method: string | null; sale_date: string | null; store_id: string | null }> = []
  let itemsPerSale: Record<string, number> = {}
  try {
    const { data: recentSalesData } = await supabase
      .from("sales")
      .select("sale_id, receipt_number, grand_total, payment_method, sale_date, store_id")
      .in("store_id", storeIds)
      .order("sale_date", { ascending: false })
      .limit(10)

    recentSales = recentSalesData || []

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Welcome back! Here's what's happening today.
            </p>
          </div>
        </div>

        {/* Welcome / Load demo data for new users */}
        <WelcomeDemoBanner show={recentSales.length === 0} />

        {/* Hero Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Today's Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <ShoppingCart className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(todayRevenue)}</div>
              <div className="flex items-center gap-1 text-xs">
                {revenueChange >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      {revenueChange.toFixed(1)}% vs yesterday
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">{Math.abs(revenueChange).toFixed(1)}% vs yesterday</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
              <ShoppingBag className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTransactions}</div>
              <div className="flex items-center gap-1 text-xs">
                {transactionChange >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      +{transactionChange} vs yesterday
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">{transactionChange} vs yesterday</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Units Sold */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Units Sold</CardTitle>
              <Package className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayUnitsSold}</div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Items sold today</p>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle
                className={`h-4 w-4 ${
                  lowStockCount > 5 ? "text-red-600" : "text-zinc-600 dark:text-zinc-400"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${lowStockCount > 5 ? "text-red-600" : "text-zinc-900 dark:text-zinc-100"}`}
              >
                {lowStockCount}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Variants with &lt;7 days inventory
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
              <CardDescription>Daily revenue over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardCharts salesData={salesChartData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Sellers (Last 7 Days)</CardTitle>
              <CardDescription>Top 5 styles by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardMetrics topSellers={topSellers} />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/pos">
                  <Plus className="mr-2 h-4 w-4" />
                  New Sale
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/inventory/intelligence?tab=deadstock">
                  <Box className="mr-2 h-4 w-4" />
                  View Dead Stock
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/purchasing/restock">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Restock Suggestions
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Last 10 transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales
              sales={recentSales || []}
              itemsPerSale={itemsPerSale}
            />
          </CardContent>
        </Card>
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
    <Suspense fallback={<LoadingState />}>
      <DashboardContent />
    </Suspense>
  )
}
