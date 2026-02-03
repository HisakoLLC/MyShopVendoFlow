"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DashboardMetricsProps {
  topSellers: Array<{ name: string; revenue: number }>
}

export function DashboardMetrics({ topSellers }: DashboardMetricsProps) {
  if (topSellers.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        No sales data available
      </div>
    )
  }

  // Truncate long names for display
  const chartData = topSellers.map((seller) => ({
    name: seller.name.length > 20 ? seller.name.substring(0, 20) + "..." : seller.name,
    revenue: seller.revenue,
    fullName: seller.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
        <XAxis
          type="number"
          className="text-xs"
          tick={{ fill: "rgb(113 113 122)" }}
          tickLine={{ stroke: "rgb(113 113 122)" }}
          tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          className="text-xs"
          tick={{ fill: "rgb(113 113 122)" }}
          tickLine={{ stroke: "rgb(113 113 122)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#e6e1de",
            border: "1px solid rgb(228 228 231)",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number | undefined, name: string | undefined, props: any) => [
            new Intl.NumberFormat("en-KE", {
              style: "currency",
              currency: "KES",
              maximumFractionDigits: 0,
            }).format(value || 0),
            props.payload.fullName || "Revenue",
          ]}
        />
        <Bar dataKey="revenue" fill="rgb(24 24 27)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
