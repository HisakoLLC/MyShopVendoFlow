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
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            Manage your customer database ({filteredAndSorted.length} customers)
          </p>
          <h1 className="font-sans text-3xl font-bold tracking-tight leading-tight text-foreground">
            Customers
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="rounded-md border-border text-foreground hover:bg-accent gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] gap-2 border-none">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border text-foreground h-10 rounded-md placeholder:text-muted-foreground focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
          <SelectTrigger className="bg-background border-border text-foreground h-10 rounded-md focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border-border">
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="vip">VIP Only</SelectItem>
            <SelectItem value="first-time">First-Time Customers</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
          <SelectTrigger className="bg-background border-border text-foreground h-10 rounded-md focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border-border">
            <SelectItem value="spend">Total Spend (High to Low)</SelectItem>
            <SelectItem value="last_purchase">Last Purchase (Recent First)</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customers Table */}
      {filteredAndSorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {searchQuery || filter !== "all"
              ? "No customers match your filters."
              : "No customers yet. Add your first customer to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Name</TableHead>
                <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Contact</TableHead>
                <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-center">VIP</TableHead>
                <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Total Spend</TableHead>
                <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-center">Txns</TableHead>
                <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Last Purchase</TableHead>
                <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((customer) => (
                <TableRow
                  key={customer.customer_id}
                  className="cursor-pointer border-b border-border hover:bg-accent/50 transition-colors duration-100 last:border-0"
                  onClick={() => setViewingCustomer(customer)}
                >
                  <TableCell className="px-6 py-4">
                    <div className="text-sm font-semibold text-foreground">
                      {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-sm text-muted-foreground block">
                      {customer.email || "—"}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground block mt-0.5">
                      {customer.phone || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {customer.is_vip ? (
                      <div className="inline-flex items-center justify-center">
                        <Crown className="h-4 w-4 text-amber-400" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center">
                        <Crown className="h-4 w-4 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="font-mono text-sm font-semibold text-foreground tabular-nums">
                      {formatPrice(customer.total_spend)}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="font-mono text-sm text-muted-foreground tabular-nums">
                      {customer.transaction_count || 0}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="text-sm text-muted-foreground">
                      {formatDateAgo(customer.last_purchase_date)}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setViewingCustomer(customer)}
                        className="w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(customer)}
                        className="w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
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
