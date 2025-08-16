"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { Edit } from "lucide-react"
import type { Purchase, PurchaseItem } from "./purchases-data-provider"

type PurchaseDetailsProps = {
  purchase: Purchase | null
  items: PurchaseItem[] | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (id: string) => void
}

export function PurchaseDetails({ purchase, items, open, onOpenChange, onEdit }: PurchaseDetailsProps) {
  if (!purchase) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Purchase Details</span>
            <span className="text-sm font-normal text-muted-foreground">
              {format(new Date(purchase.purchase_date), "PPP")}
            </span>
          </DialogTitle>
          <DialogDescription>Reference #{purchase.reference_number}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Supplier</h4>
              <p className="text-sm">{purchase.supplier_name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Total Amount</h4>
              <p className="text-sm font-bold">{formatCurrency(purchase.total_amount)}</p>
            </div>
            {purchase.notes && (
              <div className="col-span-2">
                <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                <p className="text-sm">{purchase.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Items</h4>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items && items.length > 0 ? (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 sticky bottom-0 pt-2 bg-background">
          <Button onClick={() => onEdit(purchase.id)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Purchase
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
