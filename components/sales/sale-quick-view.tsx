"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { FileText, Pencil } from "lucide-react"
import type { Sale } from "./sales-table"
import { CardFooter } from "@/components/ui/card"

type SaleQuickViewProps = {
  sale: Sale | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (id: string) => void
  onPrint: (id: string) => void
}

export function SaleQuickView({ sale, open, onOpenChange, onEdit, onPrint }: SaleQuickViewProps) {
  if (!sale) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Sale Details</span>
            <StatusBadge status={sale.paymentStatus || "Paid"} />
          </DialogTitle>
          <DialogDescription>Receipt #{sale.receipt_number}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
              <p className="text-sm">{format(new Date(sale.sale_date), "PPP")}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Time</h4>
              <p className="text-sm">{format(new Date(sale.sale_date), "p")}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
              <p className="text-sm">{sale.customer_name || "Walk-in Customer"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Payment Method</h4>
              <p className="text-sm">{sale.payment_method}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Total Amount</h4>
              <p className="text-sm font-bold">{formatCurrency(sale.total_amount)}</p>
            </div>
            {sale.paymentStatus === "Partial" && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Amount Due</h4>
                <p className="text-sm font-bold text-destructive">{formatCurrency(sale.amount_due || 0)}</p>
              </div>
            )}
            {sale.payment_reference && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Reference</h4>
                <p className="text-sm">{sale.payment_reference}</p>
              </div>
            )}
          </div>
        </div>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex space-x-2">
            {onEdit && (
              <Button onClick={() => onEdit(sale.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {onPrint && (
              <Button variant="secondary" onClick={() => onPrint(sale.id)}>
                <FileText className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            )}
          </div>
        </CardFooter>
      </DialogContent>
    </Dialog>
  )
}
