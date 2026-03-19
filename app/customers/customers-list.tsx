"use client"

import * as React from "react"
import { Search, Plus, Download, Edit, Eye, Crown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CustomerDetailModal } from "./customer-detail-modal"
import { AddCustomerModal } from "./add-customer-modal"

type Customer = {
  customer_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  is_vip: boolean | null
  total_spend: number | null
  transaction_count: number | null
  first_purchase_date: string | null
  last_purchase_date: string | null
  notes: string | null
}

type CustomersListProps = {
  initialCustomers: Customer[]
}

type FilterType = "all" | "vip" | "first-time"
type SortType = "spend" | "last_purchase" | "name"

export function CustomersList({ initialCustomers }: CustomersListProps) {
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filter, setFilter] = React.useState<FilterType>("all")
  const [sortBy, setSortBy] = React.useState<SortType>("last_purchase")
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = React.useState<Customer | null>(null)

  // Filter and sort customers
  const filteredAndSorted = React.useMemo(() => {
    let result = [...customers]

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter((customer) => {
        const name = `${customer.first_name || ""} ${customer.last_name || ""}`.trim().toLowerCase()
        const email = (customer.email || "").toLowerCase()
        const phone = (customer.phone || "").toLowerCase()
        return name.includes(query) || email.includes(query) || phone.includes(query)
      })
    }

    // Apply filter
    if (filter === "vip") {
      result = result.filter((c) => c.is_vip === true)
    } else if (filter === "first-time") {
      result = result.filter((c) => (c.transaction_count || 0) === 1)
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortBy === "spend") {
        const aSpend = a.total_spend || 0
        const bSpend = b.total_spend || 0
        return bSpend - aSpend
      } else if (sortBy === "last_purchase") {
        const aDate = a.last_purchase_date ? new Date(a.last_purchase_date).getTime() : 0
        const bDate = b.last_purchase_date ? new Date(b.last_purchase_date).getTime() : 0
        return bDate - aDate
      } else {
        // name
        const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase()
        const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase()
        return aName.localeCompare(bName)
      }
    })

    return result
  }, [customers, searchQuery, filter, sortBy])

  const formatPrice = (amount: number | null): string => {
    if (amount === null || amount === undefined) return "KES 0"
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDateAgo = (dateStr: string | null): string => {
    if (!dateStr) return "Never"
    try {
      const date = new Date(dateStr)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "Invalid date"
    }
  }

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Total Spend", "Transactions", "Last Purchase"]

    const rows = filteredAndSorted.map((customer) => [
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "N/A",
      customer.email || "N/A",
      customer.phone || "N/A",
      String(customer.total_spend || 0),
      String(customer.transaction_count || 0),
      customer.last_purchase_date
        ? new Date(customer.last_purchase_date).toLocaleDateString()
        : "Never",
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "")
    link.setAttribute("download", `customers_export_${dateStr}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCustomerCreated = () => {
    setShowAddModal(false)
    window.location.reload()
  }

  const handleCustomerUpdated = () => {
    setEditingCustomer(null)
    window.location.reload()
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
            Manage your customer database ({filteredAndSorted.length} customers)
          </p>
          <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
            Customers
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="vip">VIP Only</SelectItem>
            <SelectItem value="first-time">First-Time Customers</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spend">Total Spend (High to Low)</SelectItem>
            <SelectItem value="last_purchase">Last Purchase (Recent First)</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customers Table */}
      {filteredAndSorted.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-background-card-light p-12 text-center dark:border-border-dark dark:bg-background-card-dark">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchQuery || filter !== "all"
              ? "No customers match your filters."
              : "No customers yet. Add your first customer to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-background-card-light dark:border-border-dark dark:bg-background-card-dark">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead>Last Purchase</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((customer) => (
                <TableRow
                  key={customer.customer_id}
                  className="cursor-pointer"
                  onClick={() => setViewingCustomer(customer)}
                >
                  <TableCell>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {customer.email || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {customer.phone || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.is_vip ? (
                      <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
                        <Crown className="mr-1 h-3 w-3" />
                        VIP
                      </Badge>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatPrice(customer.total_spend)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {customer.transaction_count || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDateAgo(customer.last_purchase_date)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingCustomer(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCustomer(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddCustomerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleCustomerCreated}
      />

      {editingCustomer && (
        <AddCustomerModal
          open={!!editingCustomer}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={handleCustomerUpdated}
        />
      )}

      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onUpdate={handleCustomerUpdated}
        />
      )}
    </>
  )
}
