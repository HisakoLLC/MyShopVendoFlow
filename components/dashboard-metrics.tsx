"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, CreditCard, Package } from "lucide-react"
import { useEffect, useState } from "react"

interface MetricsData {
  todayRevenue: number
  monthRevenue: number
  totalCustomers: number
  lowStockCount: number
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<MetricsData>({
    todayRevenue: 0,
    monthRevenue: 0,
    totalCustomers: 0,
    lowStockCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/dashboard/metrics")

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Error: ${response.status}`)
        }

        const data = await response.json()
        setMetrics(data)
      } catch (error) {
        console.error("Error fetching metrics:", error)
        setError("Failed to load dashboard metrics. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
          ) : (
            <div className="text-2xl font-bold">
              KES{" "}
              {metrics.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Daily sales total</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
          ) : (
            <div className="text-2xl font-bold">
              KES{" "}
              {metrics.monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Current month total</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
          ) : (
            <div className="text-2xl font-bold">{metrics.totalCustomers}</div>
          )}
          <p className="text-xs text-muted-foreground">Unique customers</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
          ) : (
            <div className="text-2xl font-bold">{metrics.lowStockCount}</div>
          )}
          <p className="text-xs text-muted-foreground">Items below threshold</p>
        </CardContent>
      </Card>
    </div>
  )
}
