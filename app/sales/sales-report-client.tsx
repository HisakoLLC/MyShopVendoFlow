"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SaleDetailModal } from "@/components/sales/SaleDetailModal"
import { Download, ChevronLeft, ChevronRight } from "lucide-react"

interface Sale {
  sale_id: string
  receipt_number: string | null
  sale_date: string | null
  grand_total: number | null
  payment_method: string | null
  store_id: string | null
  cashier_id: string | null
  customer_id: string | null
  notes: string | null
  status: string | null
  stores: { name: string } | null
  staff: { first_name: string | null; last_name: string | null } | null
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null
}

interface Store {
  store_id: string
  name: string
}

interface Staff {
  staff_id: string
  first_name: string | null
  last_name: string | null
  email: string
}

type RefundRow = { sale_id: string | null; refund_amount: number; refunded_line_items: Array<{ quantity?: number }> | null }

export interface SalesReportClientProps {
  initialSales: Sale[]
  itemsPerSale: Record<string, number>
  initialTotalUnits: number
  initialRefunds?: RefundRow[]
  stores: Store[]
  staff: Staff[]
  defaultDateRange: { from: string; to: string }
}

type DateRangePreset = "today" | "7days" | "30days" | "90days" | "custom"

export function SalesReportClient({
  initialSales,
  itemsPerSale: initialItemsPerSale,
  initialTotalUnits,
  initialRefunds = [],
  stores,
  staff,
  defaultDateRange,
}: SalesReportClientProps) {
  const [sales, setSales] = React.useState<Sale[]>(initialSales)
  const [itemsPerSale, setItemsPerSale] = React.useState<Record<string, number>>(initialItemsPerSale)
  const [totalUnitsSold, setTotalUnitsSold] = React.useState<number>(initialTotalUnits)
  const [refunds, setRefunds] = React.useState<RefundRow[]>(initialRefunds)
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedSale, setSelectedSale] = React.useState<Sale | null>(null)

  // Filters
  const [datePreset, setDatePreset] = React.useState<DateRangePreset>("7days")
  const [customDateFrom, setCustomDateFrom] = React.useState(defaultDateRange.from)
  const [customDateTo, setCustomDateTo] = React.useState(defaultDateRange.to)
  const [selectedStore, setSelectedStore] = React.useState<string>("all")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<string>("all")
  const [selectedStaff, setSelectedStaff] = React.useState<string>("all")

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 20

  const supabase = React.useMemo(() => createClient(), [])

  // Calculate date range based on preset
  const getDateRange = React.useCallback((): { from: string; to: string } => {
    if (datePreset === "custom") {
      return { from: customDateFrom, to: customDateTo }
    }

    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const to = today.toISOString().split("T")[0]

    let from = new Date()
    from.setHours(0, 0, 0, 0)

    switch (datePreset) {
      case "today":
        // from is already today
        break
      case "7days":
        from.setDate(from.getDate() - 6) // Include today, so -6 days
        break
      case "30days":
        from.setDate(from.getDate() - 29) // Include today
        break
      case "90days":
        from.setDate(from.getDate() - 89) // Include today
        break
    }

    return { from: from.toISOString().split("T")[0], to }
  }, [datePreset, customDateFrom, customDateTo])

  // Fetch sales with filters
  const fetchSales = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const { from, to } = getDateRange()
      const storeIds = stores.map((s) => s.store_id)

      let query = supabase
        .from("sales")
        .select(
          "sale_id, receipt_number, sale_date, grand_total, payment_method, store_id, cashier_id, customer_id, notes, status, stores(name), staff(first_name, last_name), customers(first_name, last_name, phone)"
        )
        .in("store_id", storeIds)
        .gte("sale_date", `${from}T00:00:00.000Z`)
        .lte("sale_date", `${to}T23:59:59.999Z`)
        .order("sale_date", { ascending: false })

      // Apply filters
      if (selectedStore !== "all") {
        query = query.eq("store_id", selectedStore)
      }

      if (selectedPaymentMethod !== "all") {
        query = query.eq("payment_method", selectedPaymentMethod)
      }

      if (selectedStaff !== "all") {
        query = query.eq("cashier_id", selectedStaff)
      }

      const { data: salesData, error } = await query.limit(1000)

      if (error) {
        console.error("Error fetching sales:", error)
        return
      }

      setSales(salesData || [])

      const saleIds = (salesData || []).map((s: { sale_id: string }) => s.sale_id)
      if (saleIds.length > 0) {
        const [lineItemsRes, refundsRes] = await Promise.all([
          supabase
            .from("sale_line_items")
            .select("sale_id, quantity")
            .in("sale_id", saleIds),
          supabase
            .from("refunds")
            .select("sale_id, refund_amount, refunded_line_items")
            .in("sale_id", saleIds),
        ])

        const lineItems = lineItemsRes.data || []
        const itemsMap = lineItems.reduce((acc: Record<string, number>, item: { sale_id: string | null; quantity: number | null }) => {
          if (item.sale_id) {
            acc[item.sale_id] = (acc[item.sale_id] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)
        const totalUnits = lineItems.reduce((sum: number, item: { sale_id: string | null; quantity: number | null }) => sum + (item.quantity || 0), 0)
        setTotalUnitsSold(totalUnits)
        setItemsPerSale(itemsMap)
        setRefunds((refundsRes.data as RefundRow[]) || [])
      } else {
        setItemsPerSale({})
        setTotalUnitsSold(0)
        setRefunds([])
      }

      setCurrentPage(1)
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setIsLoading(false)
    }
  }, [getDateRange, selectedStore, selectedPaymentMethod, selectedStaff, stores, supabase])

  // Apply filters when they change
  React.useEffect(() => {
    fetchSales()
  }, [fetchSales])

  // Calculate summary metrics (net of refunds)
  const summary = React.useMemo(() => {
    const grossRevenue = sales.reduce((sum, s) => sum + (s.grand_total || 0), 0)
    const refundTotal = refunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0)
    const totalRevenue = Math.max(0, grossRevenue - refundTotal)
    const totalTransactions = sales.length
    const averageBasketSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    const refundedUnits = refunds.reduce((sum, r) => {
      const items = r.refunded_line_items
      if (!Array.isArray(items)) return sum
      return sum + items.reduce((q: number, it: { quantity?: number }) => q + (it?.quantity ?? 0), 0)
    }, 0)
    const totalUnits = Math.max(0, totalUnitsSold - refundedUnits)

    return {
      totalRevenue,
      totalTransactions,
      averageBasketSize,
      totalUnits,
    }
  }, [sales, totalUnitsSold, refunds])

  // Pagination
  const totalPages = Math.ceil(sales.length / itemsPerPage)
  const paginatedSales = sales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleExportCSV = () => {
    const headers = [
      "Date/Time",
      "Receipt #",
      "Store",
      "Cashier",
      "Items",
      "Payment Method",
      "Total",
    ]

    const rows = sales.map((sale) => [
      formatDateTime(sale.sale_date),
      sale.receipt_number ?? "",
      sale.stores?.name || "N/A",
      sale.staff
        ? `${sale.staff.first_name || ""} ${sale.staff.last_name || ""}`.trim() || "N/A"
        : "N/A",
      String(itemsPerSale[sale.sale_id] || 0),
      sale.payment_method || "N/A",
      String(sale.grand_total ?? ""),
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "")
    link.setAttribute("download", `sales_report_${dateStr}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background-light p-4 dark:bg-background-dark md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Sales Report</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Detailed sales analytics and transaction history
            </p>
          </div>
          <Button onClick={handleExportCSV} disabled={sales.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter sales by date, store, payment method, or staff</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Date Range Preset */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DateRangePreset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {datePreset === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Store Filter */}
              <div className="space-y-2">
                <Label>Store</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.store_id} value={store.store_id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Staff Filter */}
              <div className="space-y-2">
                <Label>Cashier</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.staff_id} value={s.staff_id}>
                        {s.first_name} {s.last_name} ({s.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(summary.totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTransactions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Basket Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(summary.averageBasketSize)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUnits}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Transactions</CardTitle>
            <CardDescription>
              {sales.length} {sales.length === 1 ? "transaction" : "transactions"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-zinc-500 dark:text-zinc-400">Loading sales...</div>
              </div>
            ) : sales.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-zinc-500 dark:text-zinc-400">No sales found for the selected filters</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSales.map((sale) => (
                        <TableRow
                          key={sale.sale_id}
                          className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <TableCell className="font-medium">
                            {formatDateTime(sale.sale_date)}
                          </TableCell>
                          <TableCell>{sale.receipt_number ?? "—"}</TableCell>
                          <TableCell>{sale.stores?.name || "N/A"}</TableCell>
                          <TableCell>
                            {sale.staff
                              ? `${sale.staff.first_name || ""} ${sale.staff.last_name || ""}`.trim() ||
                                "N/A"
                              : "N/A"}
                          </TableCell>
                          <TableCell>{itemsPerSale[sale.sale_id] || 0}</TableCell>
                          <TableCell>
                            <span className="capitalize">{sale.payment_method || "N/A"}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(sale.grand_total ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  )
}
