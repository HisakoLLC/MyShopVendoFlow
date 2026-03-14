import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { ensureAccountForCurrentUser } from "@/app/onboarding/actions"
import { getMultiStoreDashboardData } from "@/lib/dashboard/multi-store"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RetryButton } from "@/components/dashboard/RetryButton"
import { StoreFilterSelect } from "@/components/dashboard/multi-store/StoreFilterSelect"
import { StoreComparisonTable } from "@/components/dashboard/multi-store/StoreComparisonTable"
import { MultiStoreSalesChart } from "@/components/dashboard/multi-store/MultiStoreSalesChart"

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

export const dynamic = "force-dynamic"

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

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function utcMidnight(d = new Date()): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + days)
  return x
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>
}) {
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

    const params = await searchParams
    const requestedStoreId = typeof params.store === "string" ? params.store : undefined

    // Resolve account_id and role: staff from staff table, owner from get_account_id
    let accountId: string | null = null
    let role: "owner" | "manager" | "cashier" = "owner"
    const { data: staffRecord } = await supabase
      .from("staff")
      .select("account_id, active, role")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (staffRecord?.active && staffRecord.account_id) {
      accountId = staffRecord.account_id
    }
    if (staffRecord?.active && (staffRecord.role === "cashier" || staffRecord.role === "manager" || staffRecord.role === "owner")) {
      role = staffRecord.role
    } else if (staffRecord) {
      role = "cashier"
    }

    if (role === "cashier") {
      redirect("/pos")
    }

    if (!accountId) {
      try {
        const res = await supabase.rpc("get_account_id")
        const raw = res.data
        accountId =
          typeof raw === "string"
            ? raw
            : Array.isArray(raw)
              ? raw[0]
              : raw && typeof raw === "object" && "account_id" in raw
                ? (raw as { account_id: string }).account_id
                : null
        if (res.error || !accountId) {
          const ensured = await ensureAccountForCurrentUser()
          if (ensured.success) accountId = ensured.accountId ?? null
        }
      } catch {
        // fall through
      }
    }
    if (!accountId) {
      redirect("/onboarding?redirect=/dashboard")
    }

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("store_id, name")
      .eq("account_id", accountId)
      .order("name", { ascending: true })

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

    const storeRows = (stores || []) as Array<{ store_id: string | null; name: string | null }>
    const storeList: Array<{ store_id: string; name: string }> = storeRows
      .filter(
        (s): s is { store_id: string; name: string | null } =>
          typeof s.store_id === "string" && s.store_id.trim().length > 0
      )
      .map((s) => ({ store_id: s.store_id, name: s.name ?? "" }))

    const storeIds = storeList.map((s) => s.store_id)

  // If no stores exist, show a helpful message (onboarding is first-time only; complete setup in Settings)
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
              <Link href="/settings">Complete setup in Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

    const selectedStore =
      requestedStoreId && requestedStoreId !== "all"
        ? storeList.find((s) => s.store_id === requestedStoreId) ?? null
        : null

    const viewStoreIds = selectedStore ? [selectedStore.store_id] : storeIds
    const storeNameById = new Map<string, string>(storeList.map((s) => [s.store_id, s.name]))

    const today = utcMidnight(new Date())
    const yesterday = addUtcDays(today, -1)
    const todayStr = toIsoDate(today)
    const yesterdayStr = toIsoDate(yesterday)

    let todayRevenue = 0
    let yesterdayRevenue = 0
    try {
      const { data: daily, error: dailyError } = await supabase
        .from("daily_sales_metrics")
        .select("date, total_revenue, store_id")
        .in("store_id", viewStoreIds)
        .gte("date", yesterdayStr)
        .lte("date", todayStr)

      if (!dailyError && daily && daily.length > 0) {
        for (const r of daily) {
          if (r.date === todayStr) todayRevenue += r.total_revenue ?? 0
          if (r.date === yesterdayStr) yesterdayRevenue += r.total_revenue ?? 0
        }
      } else {
        // Fallback to raw sales if metrics missing or empty
        const tomorrow = addUtcDays(today, 1)
        const tomorrowStr = toIsoDate(tomorrow)
        const { data: sales, error: salesError } = await supabase
          .from("sales")
          .select("sale_date, store_id, grand_total")
          .in("store_id", viewStoreIds)
          .gte("sale_date", yesterdayStr)
          .lt("sale_date", tomorrowStr)

        if (!salesError) {
          for (const s of sales || []) {
            if (!s.sale_date) continue
            const d = s.sale_date.split("T")[0]
            const amt = s.grand_total ?? 0
            if (d === todayStr) todayRevenue += amt
            if (d === yesterdayStr) yesterdayRevenue += amt
          }
        }
      }
    } catch {
      // ignore
    }

    const data30 = await getMultiStoreDashboardData({
      supabase,
      storeIds: viewStoreIds,
      storeNameById,
      period: "30d",
    })

    const data7 = await getMultiStoreDashboardData({
      supabase,
      storeIds: viewStoreIds,
      storeNameById,
      period: "7d",
    })

    const revenueChange =
      yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0

    return (
      <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {selectedStore ? selectedStore.name : "Multi-Store Dashboard"}
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {selectedStore
                  ? "Store performance and trends."
                  : "Performance across all stores with comparisons."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedStore && (
                <Button variant="outline" asChild className="hidden sm:inline-flex">
                  <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    All stores
                  </Link>
                </Button>
              )}
              <StoreFilterSelect stores={storeList} selectedStoreId={selectedStore?.store_id ?? null} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border border-zinc-700/50 border-l-2 border-l-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Revenue Today
                </CardTitle>
                <ShoppingCart className="w-4 h-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-zinc-50">
                  {formatPrice(todayRevenue)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {revenueChange >= 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 text-xs">
                        {revenueChange.toFixed(1)}% vs yesterday
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-400" />
                      <span className="text-red-400 text-xs">
                        {Math.abs(revenueChange).toFixed(1)}% vs yesterday
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-zinc-700/50 border-l-2 border-l-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Revenue Yesterday
                </CardTitle>
                <Receipt className="w-4 h-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-zinc-50">
                  {formatPrice(yesterdayRevenue)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Previous day total</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-700/50 border-l-2 border-l-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Revenue Last 7 Days
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-zinc-50">
                  {formatPrice(data7.aggregated.total_revenue)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Across selected stores</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-700/50 border-l-2 border-l-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Revenue Last 30 Days
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-zinc-50">
                  {formatPrice(data30.aggregated.total_revenue)}
                </div>
                <p className="mt-1 text-xs text-zinc-500">Across selected stores</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-700/50 border-l-2 border-l-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Transactions 30 Days
                </CardTitle>
                <Receipt className="w-4 h-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-zinc-50">
                  {data30.aggregated.total_transactions}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Avg basket: {formatPrice(data30.aggregated.avg_basket)}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-700/50 border-l-2 border-l-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Stores
                </CardTitle>
                <Store className="w-4 h-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-zinc-50">
                  {selectedStore ? 1 : storeList.length}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {selectedStore ? "Current store view" : "Total stores in account"}
                </p>
              </CardContent>
            </Card>
          </div>

          {!selectedStore && (
            <Card>
              <CardHeader>
                <CardTitle>Store Comparison</CardTitle>
                <CardDescription>Compare performance across stores (last 30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <StoreComparisonTable rows={data30.by_store} periodLabel="Last 30 days" />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>
                Daily revenue {selectedStore ? "for this store" : "per store"} (last 30 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MultiStoreSalesChart
                stores={selectedStore ? [selectedStore] : storeList}
                dailyRevenue={data30.daily_revenue}
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>
}) {
  return (
    <Suspense fallback={<LoadingState />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  )
}
