"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { formatCurrency } from "@/lib/format-currency"

const PRIMARY_HEX = "#9333ea" // primary-600
const SLATE_200 = "rgb(226 232 240)"

interface DashboardMetricsProps {
  topSellers: Array<{ name: string; revenue: number }>
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { fullName: string; revenue: number } }>
}) {
  if (!active || !payload?.length) return null
  const { fullName, revenue } = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={fullName}>
        {fullName}
      </p>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {formatCurrency(revenue)}
      </p>
    </div>
  )
}

export function DashboardMetrics({ topSellers }: DashboardMetricsProps) {
  if (topSellers.length === 0) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 dark:border-slate-700 dark:bg-slate-900/30">
        <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
          No sales data yet. Process your first sale!
        </p>
      </div>
    )
  }

  const chartData = topSellers.map((seller) => ({
    name: seller.name.length > 24 ? seller.name.substring(0, 24) + "…" : seller.name,
    revenue: seller.revenue,
    fullName: seller.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "rgb(100 116 139)" }}
          tickLine={{ stroke: SLATE_200 }}
          axisLine={{ stroke: SLATE_200 }}
          tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 12, fill: "rgb(51 65 85)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="revenue"
          radius={[0, 6, 6, 0]}
          maxBarSize={32}
          isAnimationActive
          animationDuration={800}
          label={{ position: "right", formatter: (v: number) => formatCurrency(v), fontSize: 12 }}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={PRIMARY_HEX} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
