import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics"
import { RecentSales } from "@/components/dashboard/RecentSales"
import { RetryButton } from "@/components/dashboard/RetryButton"
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

async function DashboardContent() {
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
    redirect("/onboarding?redirect=/dashboard")
  }

  // Get all stores for this account
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("account_id", accountId)

  // Handle RLS/permission errors gracefully
  if (storesError) {
    // If it's a permission error, show helpful message
    if (storesError.message.includes("permission denied") || storesError.code === "42501") {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Database Configuration Required</CardTitle>
              <CardDescription>
                Row Level Security (RLS) policies need to be set up for the stores table.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
                <p className="font-medium mb-2">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li>Open your Supabase SQL Editor</li>
                  <li>Run the RLS setup script from <code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">SETUP_ALL_RLS.sql</code> or <code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">FIX_STORES_RLS.sql</code></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <RetryButton />
            </CardContent>
          </Card>
        </div>
      )
    }
    // For other errors, still throw
    throw new Error(`Failed to load stores: ${storesError.message}`)
  }

  const storeIds = stores?.map((s) => s.store_id) || []

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

  // Fetch today's metrics
  const { data: todaySales, error: todayError } = await supabase
    .from("sales")
    .select("grand_total, sale_id, sale_date")
    .in("store_id", storeIds)
    .gte("sale_date", todayStr)
    .lt("sale_date", new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0])

  const { data: todayLineItems, error: todayLineItemsError } = await supabase
    .from("sale_line_items")
    .select("quantity, sale_id, sales!inner(store_id, sale_date)")
    .in("sales.store_id", storeIds)
    .gte("sales.sale_date", todayStr)
    .lt("sales.sale_date", new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0])

  // Fetch yesterday's metrics
  const { data: yesterdaySales, error: yesterdayError } = await supabase
    .from("sales")
    .select("grand_total, sale_id")
    .in("store_id", storeIds)
    .gte("sale_date", yesterdayStr)
    .lt("sale_date", todayStr)

  const { data: yesterdayLineItems, error: yesterdayLineItemsError } = await supabase
    .from("sale_line_items")
    .select("quantity, sale_id, sales!inner(store_id, sale_date)")
    .in("sales.store_id", storeIds)
    .gte("sales.sale_date", yesterdayStr)
    .lt("sales.sale_date", todayStr)

  // Calculate today's metrics
  const todayRevenue = (todaySales || []).reduce((sum, s) => sum + (s.grand_total || 0), 0)
  const todayTransactions = (todaySales || []).length
  const todayUnitsSold = (todayLineItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0)

  // Calculate yesterday's metrics
  const yesterdayRevenue = (yesterdaySales || []).reduce((sum, s) => sum + (s.grand_total || 0), 0)
  const yesterdayTransactions = (yesterdaySales || []).length

  // Calculate revenue change
  const revenueChange =
    yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
  const transactionChange = yesterdayTransactions > 0 ? todayTransactions - yesterdayTransactions : 0

  // Fetch low stock count (variants with days_of_inventory < 7)
  const { data: lowStockVariants, error: lowStockError } = await supabase
    .from("variant_metrics")
    .select("variant_id, days_of_inventory")
    .lt("days_of_inventory", 7)
    .not("days_of_inventory", "is", null)

  const lowStockCount = (lowStockVariants || []).length

  // Fetch last 7 days sales data
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]

  // Try to use daily_sales_metrics first, fallback to aggregating sales
  const { data: dailyMetrics, error: dailyMetricsError } = await supabase
    .from("daily_sales_metrics")
    .select("date, total_revenue")
    .in("store_id", storeIds)
    .gte("date", sevenDaysAgoStr)
    .lte("date", todayStr)
    .order("date", { ascending: true })

  // If daily_sales_metrics doesn't have data, aggregate from sales
  let salesChartData: Array<{ date: string; revenue: number }> = []
  if (dailyMetrics && dailyMetrics.length > 0) {
    salesChartData = dailyMetrics.map((m) => ({
      date: new Date(m.date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
      revenue: m.total_revenue || 0,
    }))
  } else {
    // Aggregate from sales table
    const { data: salesData, error: salesDataError } = await supabase
      .from("sales")
      .select("sale_date, grand_total")
      .in("store_id", storeIds)
      .gte("sale_date", sevenDaysAgoStr)
      .lte("sale_date", todayStr)

    if (!salesDataError && salesData) {
      // Group by date
      const grouped = salesData.reduce((acc, sale) => {
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
          revenue,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
  }

  // Fetch top sellers (last 7 days) - aggregate from sale_line_items
  // First get sales in the date range
  const { data: salesInRange, error: salesInRangeError } = await supabase
    .from("sales")
    .select("sale_id")
    .in("store_id", storeIds)
    .gte("sale_date", sevenDaysAgoStr)
    .lte("sale_date", todayStr)

  const saleIdsInRange = (salesInRange || []).map((s) => s.sale_id)

  // Then get line items for those sales
  const { data: topSellersData, error: topSellersError } = saleIdsInRange.length
    ? await supabase
        .from("sale_line_items")
        .select(
          "line_total, variant_id, product_variants!inner(style_id, product_styles!inner(style_id, name))"
        )
        .in("sale_id", saleIdsInRange)
    : { data: [], error: null }

  // Aggregate top sellers by style
  const topSellersMap = new Map<string, { name: string; revenue: number }>()
  if (topSellersData) {
    topSellersData.forEach((item) => {
      const style = item.product_variants?.product_styles as any
      if (style?.style_id && style?.name) {
        const current = topSellersMap.get(style.style_id) || { name: style.name, revenue: 0 }
        current.revenue += item.line_total || 0
        topSellersMap.set(style.style_id, current)
      }
    })
  }

  const topSellers = Array.from(topSellersMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Fetch recent sales
  const { data: recentSales, error: recentSalesError } = await supabase
    .from("sales")
    .select("sale_id, receipt_number, grand_total, payment_method, sale_date, store_id")
    .in("store_id", storeIds)
    .order("sale_date", { ascending: false })
    .limit(10)

  // Get line items count for recent sales
  const recentSaleIds = (recentSales || []).map((s) => s.sale_id)
  const { data: recentLineItems } = recentSaleIds.length
    ? await supabase
        .from("sale_line_items")
        .select("sale_id")
        .in("sale_id", recentSaleIds)
    : { data: [], error: null }

  // Count items per sale
  const itemsPerSale = (recentLineItems || []).reduce((acc, item) => {
    acc[item.sale_id] = (acc[item.sale_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

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

  // Handle errors - log but continue with partial data
  if (todayError) {
    console.error("Error fetching today's sales:", todayError)
  }
  if (todayLineItemsError) {
    console.error("Error fetching today's line items:", todayLineItemsError)
  }
  if (yesterdayError) {
    console.error("Error fetching yesterday's sales:", yesterdayError)
  }
  if (yesterdayLineItemsError) {
    console.error("Error fetching yesterday's line items:", yesterdayLineItemsError)
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
              formatPrice={formatPrice}
              formatTime={formatTime}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DashboardContent />
    </Suspense>
  )
}
