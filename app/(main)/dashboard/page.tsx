import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardMetrics } from "@/components/dashboard-metrics"
import { LowStockAlert } from "@/components/low-stock-alert"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Package, Truck } from "lucide-react"
import Link from "next/link"
import { WelcomeBanner } from "@/components/welcome-banner"

export default function Dashboard() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4">
        <WelcomeBanner />

        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Link href="/sales/new">
              <Button className="bg-primary hover:bg-primary/90">
                <ShoppingCart className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/sales" className="transition-transform hover:scale-[1.01]">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Manage Sales</div>
                <p className="text-xs text-muted-foreground">Process transactions and generate receipts</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory" className="transition-transform hover:scale-[1.01]">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Manage Inventory</div>
                <p className="text-xs text-muted-foreground">Track products, stock levels, and categories</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/purchases" className="transition-transform hover:scale-[1.01]">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Purchases</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Manage Purchases</div>
                <p className="text-xs text-muted-foreground">Record stock purchases from suppliers</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Suspense fallback={<div>Loading metrics...</div>}>
          <DashboardMetrics />
        </Suspense>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading stock alerts...</div>}>
              <LowStockAlert />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
