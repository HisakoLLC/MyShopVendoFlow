"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DashboardChartsProps {
  salesData: Array<{ date: string; revenue: number }>
}

export function DashboardCharts({ salesData }: DashboardChartsProps) {
  if (salesData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        No sales data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={salesData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fill: "rgb(113 113 122)" }}
          tickLine={{ stroke: "rgb(113 113 122)" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "rgb(113 113 122)" }}
          tickLine={{ stroke: "rgb(113 113 122)" }}
          tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#e6e1de",
            border: "1px solid rgb(228 228 231)",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number | undefined) => [
            new Intl.NumberFormat("en-KE", {
              style: "currency",
              currency: "KES",
              maximumFractionDigits: 0,
            }).format(value || 0),
            "Revenue",
          ]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="rgb(24 24 27)"
          strokeWidth={2}
          dot={{ fill: "rgb(24 24 27)", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
