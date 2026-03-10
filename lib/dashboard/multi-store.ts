export type Period = "7d" | "30d" | "90d"

export type MultiStoreAggregated = {
  total_revenue: number
  total_transactions: number
  avg_basket: number
  period: Period
}

export type MultiStoreByStoreRow = {
  store_id: string
  store_name: string
  revenue: number
  transactions: number
  avg_basket: number
  revenue_per_day: number
  trend_percent: number
}

export type MultiStoreDailyRevenueRow = {
  date: string
  store_revenues: Record<string, number>
}

export type MultiStoreDashboardData = {
  aggregated: MultiStoreAggregated
  by_store: MultiStoreByStoreRow[]
  daily_revenue: MultiStoreDailyRevenueRow[]
}

type DailySalesMetricRow = {
  date: string
  store_id: string | null
  total_revenue: number | null
  transaction_count: number | null
}

type SaleRow = {
  sale_date: string | null
  store_id: string | null
  grand_total: number
}

export function parsePeriod(value: string | null): Period {
  if (value === "7d" || value === "30d" || value === "90d") return value
  return "30d"
}

function periodDays(period: Period): number {
  switch (period) {
    case "7d":
      return 7
    case "90d":
      return 90
    case "30d":
    default:
      return 30
  }
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

function salesToDailyMetrics(rows: SaleRow[]): DailySalesMetricRow[] {
  const map = new Map<
    string,
    { store_id: string; date: string; total_revenue: number; transaction_count: number }
  >()
  for (const s of rows) {
    if (!s.store_id || !s.sale_date) continue
    const date = s.sale_date.split("T")[0]
    if (!date) continue
    const key = `${s.store_id}__${date}`
    const cur = map.get(key) || {
      store_id: s.store_id,
      date,
      total_revenue: 0,
      transaction_count: 0,
    }
    cur.total_revenue += s.grand_total ?? 0
    cur.transaction_count += 1
    map.set(key, cur)
  }
  return Array.from(map.values())
}

export async function getMultiStoreDashboardData(args: {
  supabase: any
  storeIds: string[]
  storeNameById: Map<string, string>
  period: Period
  now?: Date
}): Promise<MultiStoreDashboardData> {
  const { supabase, storeIds, storeNameById, period } = args
  const days = periodDays(period)

  const end = utcMidnight(args.now ?? new Date())
  const start = addUtcDays(end, -(days - 1))

  const prevEnd = addUtcDays(start, -1)
  const prevStart = addUtcDays(prevEnd, -(days - 1))

  const startStr = toIsoDate(start)
  const endStr = toIsoDate(end)
  const prevStartStr = toIsoDate(prevStart)
  const prevEndStr = toIsoDate(prevEnd)

  const getDailyMetrics = async (rangeStart: string, rangeEnd: string) => {
    return supabase
      .from("daily_sales_metrics")
      .select("date, store_id, total_revenue, transaction_count")
      .in("store_id", storeIds)
      .gte("date", rangeStart)
      .lte("date", rangeEnd)
  }

  const startTomorrowStr = toIsoDate(addUtcDays(end, 1))
  const prevEndExclusiveStr = toIsoDate(addUtcDays(prevEnd, 1))

  const getSales = async (rangeStart: string, rangeEndExclusive: string) => {
    return supabase
      .from("sales")
      .select("sale_date, store_id, grand_total")
      .in("store_id", storeIds)
      .gte("sale_date", rangeStart)
      .lt("sale_date", rangeEndExclusive)
  }

  let current: DailySalesMetricRow[] = []
  let previous: DailySalesMetricRow[] = []

  const { data: currentRows, error: currentError } = await getDailyMetrics(startStr, endStr)
  const { data: prevRows, error: prevError } = await getDailyMetrics(prevStartStr, prevEndStr)

  const msg = `${currentError?.message ?? ""} ${prevError?.message ?? ""}`.toLowerCase()
  const dailyMetricsMissing = msg.includes("daily_sales_metrics") && msg.includes("does not exist")

  const buildFromSales = async () => {
    const { data: curSales, error: curSalesError } = await getSales(startStr, startTomorrowStr)
    if (curSalesError) throw new Error(curSalesError.message)
    const { data: prevSales, error: prevSalesError } = await getSales(prevStartStr, prevEndExclusiveStr)
    if (prevSalesError) throw new Error(prevSalesError.message)
    current = salesToDailyMetrics(((curSales || []) as SaleRow[]).filter(Boolean))
    previous = salesToDailyMetrics(((prevSales || []) as SaleRow[]).filter(Boolean))
  }

  if (!currentError && !prevError) {
    current = (currentRows || []) as DailySalesMetricRow[]
    previous = (prevRows || []) as DailySalesMetricRow[]

    // If metrics table exists but has no rows for the period yet, fall back to raw sales.
    if (current.length === 0 && previous.length === 0) {
      await buildFromSales()
    }
  } else if (dailyMetricsMissing) {
    await buildFromSales()
  } else {
    throw new Error((currentError || prevError)?.message || "Failed to load dashboard metrics")
  }

  const sumByStore = (rows: DailySalesMetricRow[]) => {
    const m = new Map<string, { revenue: number; transactions: number }>()
    for (const r of rows) {
      const sid = r.store_id
      if (!sid) continue
      const prev = m.get(sid) || { revenue: 0, transactions: 0 }
      prev.revenue += r.total_revenue ?? 0
      prev.transactions += r.transaction_count ?? 0
      m.set(sid, prev)
    }
    return m
  }

  const currentByStore = sumByStore(current)
  const prevByStore = sumByStore(previous)

  const by_store: MultiStoreByStoreRow[] = storeIds.map((store_id) => {
    const cur = currentByStore.get(store_id) || { revenue: 0, transactions: 0 }
    const prev = prevByStore.get(store_id) || { revenue: 0, transactions: 0 }

    const avg_basket = cur.transactions > 0 ? cur.revenue / cur.transactions : 0
    const revenue_per_day = days > 0 ? cur.revenue / days : 0
    const trend_percent = prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : 0

    return {
      store_id,
      store_name: storeNameById.get(store_id) ?? "",
      revenue: cur.revenue,
      transactions: cur.transactions,
      avg_basket,
      revenue_per_day,
      trend_percent,
    }
  })

  const aggregatedRevenue = by_store.reduce((sum, s) => sum + (s.revenue || 0), 0)
  const aggregatedTransactions = by_store.reduce((sum, s) => sum + (s.transactions || 0), 0)
  const aggregatedAvgBasket = aggregatedTransactions > 0 ? aggregatedRevenue / aggregatedTransactions : 0

  const dailyMap = new Map<string, Record<string, number>>()
  for (let i = 0; i < days; i++) {
    const d = addUtcDays(start, i)
    const key = toIsoDate(d)
    const base: Record<string, number> = {}
    for (const sid of storeIds) base[sid] = 0
    dailyMap.set(key, base)
  }

  for (const r of current) {
    if (!r.store_id) continue
    const row = dailyMap.get(r.date)
    if (!row) continue
    row[r.store_id] = (row[r.store_id] || 0) + (r.total_revenue ?? 0)
  }

  const daily_revenue: MultiStoreDailyRevenueRow[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, store_revenues]) => ({ date, store_revenues }))

  return {
    aggregated: {
      total_revenue: aggregatedRevenue,
      total_transactions: aggregatedTransactions,
      avg_basket: aggregatedAvgBasket,
      period,
    },
    by_store,
    daily_revenue,
  }
}

