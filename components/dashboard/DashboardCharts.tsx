"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { formatCurrency } from "@/lib/format-currency"

const PRIMARY_HEX = "#9333ea" // primary-600
const PRIMARY_50_HEX = "#faf5ff" // primary-50
const SLATE_200 = "rgb(226 232 240)"

interface DashboardChartsProps {
  salesData: Array<{ date: string; revenue: number }>
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length || payload[0].value == null) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function DashboardCharts({ salesData }: DashboardChartsProps) {
  if (salesData.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
        No sales data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={salesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY_50_HEX} stopOpacity={0.8} />
            <stop offset="100%" stopColor={PRIMARY_50_HEX} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={SLATE_200} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "rgb(100 116 139)" }}
          tickLine={{ stroke: "rgb(226 232 240)" }}
          axisLine={{ stroke: "rgb(226 232 240)" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "rgb(100 116 139)" }}
          tickLine={{ stroke: "rgb(226 232 240)" }}
          axisLine={false}
          tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={PRIMARY_HEX}
          strokeWidth={2}
          fill="url(#salesGradient)"
          dot={{ fill: PRIMARY_HEX, r: 4 }}
          activeDot={{ r: 6, fill: PRIMARY_HEX, stroke: "#fff", strokeWidth: 2 }}
          isAnimationActive
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
