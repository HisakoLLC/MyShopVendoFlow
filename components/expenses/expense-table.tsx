"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Search, Eye, Trash2, Download, FileText, RefreshCw } from "lucide-react"
import { ExpenseForm } from "./expense-form"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

interface Expense {
  id: string
  title: string
  category: string
  amount: number
  payment_method: string
  expense_date: string
  notes?: string
  attachment_url?: string
  recorded_by: string
  created_at: string
  updated_at?: string
}

interface ExpenseTableProps {
  filters?: {
    category?: string
    dateRange?: DateRange
  }
  refreshTrigger?: number
  onExpenseUpdated?: () => void
}

export function ExpenseTable({ filters, refreshTrigger, onExpenseUpdated }: ExpenseTableProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  const { toast } = useToast()

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search,
      })

      if (paymentMethodFilter && paymentMethodFilter !== "all") {
        params.append("paymentMethod", paymentMethodFilter)
      }

      if (filters?.category && filters.category !== "all") {
        params.append("category", filters.category)
      }

      if (filters?.dateRange?.from) {
        params.append("startDate", filters.dateRange.from.toISOString())
      }

      if (filters?.dateRange?.to) {
        params.append("endDate", filters.dateRange.to.toISOString())
      }

      const response = await fetch(`/api/expenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalRecords(data.pagination?.total || 0)
      } else {
        throw new Error("Failed to fetch expenses")
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [currentPage, search, paymentMethodFilter, filters, refreshTrigger])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, paymentMethodFilter, filters])

  const handleViewExpense = (expense: Expense) => {
    console.log("Viewing expense:", expense)
    setSelectedExpense(expense)
    setViewDialogOpen(true)
  }

  const handleExpenseChange = () => {
    console.log("Expense changed, triggering refresh...")
    fetchExpenses()
    onExpenseUpdated?.()
  }

  const handleDelete = async (id: string) => {
    try {
      setDeleteLoading(id)
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Expense deleted successfully",
        })
        handleExpenseChange()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete expense",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast({
        title: "No Data",
        description: "No expenses to export",
        variant: "destructive",
      })
      return
    }

    const csvContent = [
      ["Date", "Title", "Category", "Amount", "Payment Method", "Notes"].join(","),
      ...expenses.map((expense) =>
        [
          format(new Date(expense.expense_date), "yyyy-MM-dd HH:mm"),
          `"${expense.title.replace(/"/g, '""')}"`,
          expense.category,
          expense.amount,
          expense.payment_method,
          `"${(expense.notes || "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Expenses exported to CSV successfully",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      Utilities: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      Supplies: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      Rent: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      Transport: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      Other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    }
    return colors[category as keyof typeof colors] || colors.Other
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Expense Records</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {totalRecords} {totalRecords === 1 ? "expense" : "expenses"} found
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={fetchExpenses} size="sm" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCSV} size="sm" disabled={expenses.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <ExpenseForm onExpenseAdded={handleExpenseChange} />
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="M-Pesa">M-Pesa</SelectItem>
              <SelectItem value="Bank">Bank Transfer</SelectItem>
              <SelectItem value="Card">Credit/Debit Card</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="mb-4">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">No expenses found</p>
              <p className="text-sm">Try adjusting your filters or add a new expense.</p>
            </div>
            <ExpenseForm onExpenseAdded={handleExpenseChange} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(expense.expense_date), "MMM dd, yyyy")}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(expense.expense_date), "HH:mm")}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={expense.title}>
                        {expense.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getCategoryColor(expense.category)}>
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>{expense.payment_method}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* View Details */}
                          <Button variant="ghost" size="sm" onClick={() => handleViewExpense(expense)}>
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={deleteLoading === expense.id}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{expense.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(expense.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deleteLoading === expense.id}
                                >
                                  {deleteLoading === expense.id ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords}{" "}
                  expenses
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="text-sm">{selectedExpense.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="text-sm">{selectedExpense.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className="text-sm font-medium">{formatCurrency(selectedExpense.amount)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                    <p className="text-sm">{selectedExpense.payment_method}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Recorded By</label>
                    <p className="text-sm">{selectedExpense.recorded_by}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <p className="text-sm">{format(new Date(selectedExpense.expense_date), "PPP p")}</p>
                </div>
                {selectedExpense.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm">{selectedExpense.notes}</p>
                  </div>
                )}
                {selectedExpense.attachment_url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Attachment</label>
                    <p className="text-sm">
                      <a
                        href={selectedExpense.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Receipt
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
