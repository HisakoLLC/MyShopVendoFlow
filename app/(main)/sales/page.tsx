"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SalesTable, type Sale } from "@/components/sales/sales-table"
import { SalesSummary } from "@/components/sales/sales-summary"
import { SalesExport } from "@/components/sales/sales-export"
import { SaleQuickView } from "@/components/sales/sale-quick-view"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { SaleEditForm } from "@/components/sales/sale-edit-form"
import type { DateRange } from "react-day-picker"
import { toast } from "@/components/ui/use-toast"
import { getSalesData, deleteSale } from "@/components/sales/sales-data-provider"

// Mock data for salespeople until we implement user management
const MOCK_SALESPEOPLE = [
  { id: "1", name: "Jane Smith" },
  { id: "2", name: "Mike Brown" },
]

export default function SalesPage() {
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [filters, setFilters] = useState({
    search: "",
    dateRange: undefined as DateRange | undefined,
    paymentStatus: "",
    paymentMethod: "",
    salesperson: "",
  })

  useEffect(() => {
    fetchSales()
  }, [])

  // Apply filters whenever they change
  useEffect(() => {
    let result = [...sales]

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (sale) =>
          (sale.customer_name && sale.customer_name.toLowerCase().includes(searchLower)) ||
          sale.receipt_number.toLowerCase().includes(searchLower),
      )
    }

    // Apply date range filter
    if (filters.dateRange?.from) {
      const fromDate = new Date(filters.dateRange.from)
      fromDate.setHours(0, 0, 0, 0)

      result = result.filter((sale) => {
        const saleDate = new Date(sale.sale_date)
        if (filters.dateRange?.to) {
          const toDate = new Date(filters.dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          return saleDate >= fromDate && saleDate <= toDate
        }
        return saleDate >= fromDate
      })
    }

    // Apply payment method filter
    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      result = result.filter((sale) => sale.payment_method.toLowerCase() === filters.paymentMethod.toLowerCase())
    }

    setFilteredSales(result)
  }, [sales, filters])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const data = await getSalesData()
      setSales(data)
      setFilteredSales(data)
    } catch (error) {
      console.error("Error fetching sales:", error)
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary statistics
  const totalSales = filteredSales.length
  const totalAmount = filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
  const paidAmount = filteredSales.reduce((sum, sale) => {
    // Check both payment_status and paymentStatus fields
    const status = sale.payment_status || sale.paymentStatus
    if (status === "Paid" || !status) {
      return sum + Number(sale.total_amount)
    } else if (status === "Partial" && sale.amount_paid) {
      return sum + Number(sale.amount_paid)
    }
    return sum
  }, 0)
  const unpaidAmount = totalAmount - paidAmount

  const handleViewSale = (id: string) => {
    const sale = sales.find((s) => s.id === id) || null
    setSelectedSale(sale)
    setQuickViewOpen(true)
  }

  const handleEditSale = (id: string) => {
    const sale = sales.find((s) => s.id === id) || null
    setSelectedSale(sale)
    setQuickViewOpen(false)
    setEditOpen(true)
  }

  const handleEditSalePage = (id: string) => {
    router.push(`/sales/${id}/edit`)
  }

  const handleDeleteSale = async (id: string) => {
    try {
      const result = await deleteSale(id)

      if (result.success) {
        // Update local state
        setSales(sales.filter((sale) => sale.id !== id))
        setFilteredSales(filteredSales.filter((sale) => sale.id !== id))
        toast({
          title: "Sale deleted",
          description: "The sale has been successfully deleted",
        })
      } else {
        throw new Error("Failed to delete sale")
      }
    } catch (error) {
      console.error("Error deleting sale:", error)
      toast({
        title: "Error",
        description: "Failed to delete sale. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePrintReceipt = (id: string) => {
    // In a real app, you would generate and print a receipt
    toast({
      title: "Printing receipt",
      description: `Printing receipt for sale #${id}.`,
    })
  }

  const handleExport = (format: "csv" | "pdf") => {
    // In a real app, you would generate and download the export file
    toast({
      title: `Exporting as ${format.toUpperCase()}`,
      description: `Your export will be ready shortly.`,
    })
  }

  const handleEditSuccess = () => {
    setEditOpen(false)
    fetchSales()
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales</h2>
          <p className="text-muted-foreground">Manage and track your sales transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <SalesExport onExport={handleExport} disabled={filteredSales.length === 0} />
          <Link href="/sales/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Sale
            </Button>
          </Link>
        </div>
      </div>

      <SalesSummary
        totalSales={totalSales}
        totalAmount={totalAmount}
        paidAmount={paidAmount}
        unpaidAmount={unpaidAmount}
      />

      <SalesTable
        data={filteredSales}
        salespeople={MOCK_SALESPEOPLE}
        onViewSale={handleViewSale}
        onEditSale={handleEditSale}
        onEditSalePage={handleEditSalePage}
        onDeleteSale={handleDeleteSale}
        onPrintReceipt={handlePrintReceipt}
        onExport={handleExport}
        onFiltersChange={setFilters}
        filters={filters}
      />

      <SaleQuickView
        sale={selectedSale}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onEdit={handleEditSale}
        onPrint={handlePrintReceipt}
      />

      {/* Sale Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl">
          <SaleEditForm saleId={selectedSale?.id} onSuccess={handleEditSuccess} onCancel={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
