"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, TrendingUp, Receipt, RefreshCw } from "lucide-react"

interface ExpenseMetrics {
  today: { total: number; count: number }
  month: { total: number; count: number }
  allTime: { total: number; count: number }
}

interface ExpenseSummaryProps {
  refreshTrigger?: number
}

export function ExpenseSummary({ refreshTrigger }: ExpenseSummaryProps) {
  const [metrics, setMetrics] = useState<ExpenseMetrics>({
    today: { total: 0, count: 0 },
    month: { total: 0, count: 0 },
    allTime: { total: 0, count: 0 },
  })
  const [loading, setLoading] = useState(true)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      console.log("ExpenseSummary: Fetching metrics, refreshTrigger:", refreshTrigger)

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/expenses/metrics?_t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to fetch metrics:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("ExpenseSummary: Received metrics data:", data)

      setMetrics({
        today: data.today || { total: 0, count: 0 },
        month: data.month || { total: 0, count: 0 },
        allTime: data.allTime || { total: 0, count: 0 },
      })
    } catch (error) {
      console.error("Error fetching expense metrics:", error)
      // Set default values on error
      setMetrics({
        today: { total: 0, count: 0 },
        month: { total: 0, count: 0 },
        allTime: { total: 0, count: 0 },
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("ExpenseSummary: useEffect triggered, refreshTrigger:", refreshTrigger)
    fetchMetrics()
  }, [refreshTrigger])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Heading with refresh indicator */}
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold">Expense Summary</h2>
        {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(metrics.today.total)}</div>
            <p className="text-xs text-muted-foreground">{loading ? "..." : `${metrics.today.count} transactions`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(metrics.month.total)}</div>
            <p className="text-xs text-muted-foreground">{loading ? "..." : `${metrics.month.count} transactions`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(metrics.allTime.total)}</div>
            <p className="text-xs text-muted-foreground">{loading ? "..." : `${metrics.allTime.count} transactions`}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
