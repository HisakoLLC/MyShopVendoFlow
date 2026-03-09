"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export type MultiStoreChartStore = { store_id: string; name: string }
export type MultiStoreDailyRevenue = { date: string; store_revenues: Record<string, number> }

const COLORS = [
  "#0f172a",
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#0ea5e9",
  "#dc2626",
  "#4b5563",
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value || 0)

function formatDateLabel(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return d.toLocaleDateString("en-KE", { month: "short", day: "numeric" })
}

export function MultiStoreSalesChart({
  stores,
  dailyRevenue,
}: {
  stores: MultiStoreChartStore[]
  dailyRevenue: MultiStoreDailyRevenue[]
}) {
  const [showAllStores, setShowAllStores] = React.useState(true)
  const [visibleStoreIds, setVisibleStoreIds] = React.useState<string[]>(
    () => stores.map((s) => s.store_id) // default: all
  )

  React.useEffect(() => {
    setVisibleStoreIds((prev) => {
      const all = new Set(stores.map((s) => s.store_id))
      const next = prev.filter((id) => all.has(id))
      return next.length > 0 ? next : stores.map((s) => s.store_id)
    })
  }, [stores])

  const chartData = React.useMemo(() => {
    return (dailyRevenue || []).map((d) => {
      const all = Object.values(d.store_revenues || {}).reduce((sum, v) => sum + (v || 0), 0)
      return {
        date: formatDateLabel(d.date),
        all,
        ...d.store_revenues,
      }
    })
  }, [dailyRevenue])

  if (!dailyRevenue || dailyRevenue.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        No sales data available
      </div>
    )
  }

  const toggleStore = (storeId: string, checked: boolean) => {
    setVisibleStoreIds((prev) => {
      if (checked) return Array.from(new Set([...prev, storeId]))
      const next = prev.filter((id) => id !== storeId)
      return next.length > 0 ? next : prev
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/30">
        <label className="inline-flex items-center gap-2">
          <Checkbox
            checked={showAllStores}
            onCheckedChange={(v) => setShowAllStores(Boolean(v))}
          />
          <span className="font-medium text-zinc-800 dark:text-zinc-100">All Stores</span>
        </label>
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-wrap gap-3">
          {stores.map((s, idx) => {
            const checked = visibleStoreIds.includes(s.store_id)
            const color = COLORS[idx % COLORS.length]
            return (
              <label key={s.store_id} className="inline-flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggleStore(s.store_id, Boolean(v))}
                />
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className={cn("max-w-[160px] truncate", !checked && "opacity-60")}>
                    {s.name}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
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
            tickFormatter={(value) => `KES ${(Number(value) / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#e6e1de",
              border: "1px solid rgb(228 228 231)",
              borderRadius: "0.5rem",
            }}
            formatter={(value: unknown, name?: string) => {
              const key = name ?? ""
              const label =
                key === "all"
                  ? "All Stores"
                  : stores.find((s) => s.store_id === key)?.name ?? key
              const n = typeof value === "number" ? value : Number(value || 0)
              return [formatCurrency(n), label]
            }}
          />

          {showAllStores && (
            <Line
              type="monotone"
              dataKey="all"
              stroke="#111827"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          )}

          {stores.map((s, idx) =>
            visibleStoreIds.includes(s.store_id) ? (
              <Line
                key={s.store_id}
                type="monotone"
                dataKey={s.store_id}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

