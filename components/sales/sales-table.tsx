"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { Eye, Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SalesFilters, type SalesFilters as SalesFiltersType } from "./sales-filters"

// Update the Sale type to match our database structure
export type Sale = {
  id: string
  receipt_number: string
  sale_date: string
  total_amount: number
  payment_method: string
  payment_reference?: string | null
  notes?: string | null
  customer_name?: string
  payment_status?: string
  paymentStatus?: string
  amount_paid?: number
  amount_due?: number
  user_id?: string
}

type SalesTableProps = {
  data: Sale[]
  salespeople: { id: string; name: string }[]
  onViewSale: (id: string) => void
  onEditSale: (id: string) => void
  onEditSalePage?: (id: string) => void
  onDeleteSale: (id: string) => void
  onPrintReceipt: (id: string) => void
  onExport: (format: "csv" | "pdf") => void
  onFiltersChange: (filters: SalesFiltersType) => void
  filters: SalesFiltersType
}

export function SalesTable({
  data,
  salespeople,
  onViewSale,
  onEditSale,
  onEditSalePage,
  onDeleteSale,
  onPrintReceipt,
  onExport,
  onFiltersChange,
  filters,
}: SalesTableProps) {
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setSaleToDelete(id)
  }

  const handleConfirmDelete = () => {
    if (saleToDelete) {
      onDeleteSale(saleToDelete)
      setSaleToDelete(null)
    }
  }

  const columns: ColumnDef<Sale>[] = [
    {
      accessorKey: "receipt_number",
      header: "Invoice #",
      cell: ({ row }) => <div className="font-medium">{row.getValue("receipt_number")}</div>,
    },
    {
      accessorKey: "sale_date",
      header: "Date & Time",
      cell: ({ row }) => {
        const date = new Date(row.getValue("sale_date"))
        return (
          <div className="font-medium">
            <div>{format(date, "MMM dd, yyyy")}</div>
            <div className="text-xs text-muted-foreground">{format(date, "h:mm a")}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => <div>{row.getValue("customer_name") || "Walk-in Customer"}</div>,
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => <div className="font-medium">{formatCurrency(row.getValue("total_amount"))}</div>,
    },
    {
      accessorKey: "payment_status",
      header: "Status",
      cell: ({ row }) => {
        // Check both payment_status and paymentStatus fields
        const status = row.getValue("payment_status") || row.original.paymentStatus || "Paid"
        return <StatusBadge status={status as string} />
      },
    },
    {
      accessorKey: "payment_method",
      header: "Payment Method",
      cell: ({ row }) => <div>{row.getValue("payment_method")}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const sale = row.original

        return (
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="icon" onClick={() => onViewSale(sale.id)} title="View details">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEditSale(sale.id)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteClick(sale.id)}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
              title="Delete sale"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <SalesFilters filters={filters} onFiltersChange={onFiltersChange} salespeople={salespeople} />

      <DataTable
        columns={columns}
        data={data}
        searchColumn="customer_name"
        searchPlaceholder="Filter customers..."
        showSearch={false}
      />

      <Dialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sale? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
