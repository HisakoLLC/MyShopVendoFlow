"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { Printer, RotateCcw } from "lucide-react"

interface Sale {
  sale_id: string
  receipt_number: string
  sale_date: string | null
  grand_total: number
  payment_method: string | null
  store_id: string | null
  cashier_id: string | null
  customer_id: string | null
  stores: { name: string } | null
  staff: { first_name: string | null; last_name: string | null } | null
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null
}

interface SaleLineItem {
  line_item_id: string
  variant_id: string | null
  quantity: number | null
  unit_price: number
  line_total: number
  product_variants: {
    size: string
    color: string
    sku: string
    product_styles: {
      name: string
      image_url: string | null
    } | null
  } | null
}

interface SaleDetailModalProps {
  sale: Sale
  onClose: () => void
}

export function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  const [lineItems, setLineItems] = React.useState<SaleLineItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [saleDetails, setSaleDetails] = React.useState<{
    subtotal: number
    tax_total: number | null
    grand_total: number
  } | null>(null)
  const [showReceipt, setShowReceipt] = React.useState(false)
  const supabase = React.useMemo(() => createClient(), [])

  // Fetch full sale details and line items
  React.useEffect(() => {
    async function fetchSaleDetails() {
      setIsLoading(true)
      try {
        // Fetch full sale record
        const { data: saleData, error: saleError } = await supabase
          .from("sales")
          .select("subtotal, tax_total, grand_total, discount_total")
          .eq("sale_id", sale.sale_id)
          .single()

        if (saleError) {
          console.error("Error fetching sale details:", saleError)
        } else {
          setSaleDetails(saleData)
        }

        // Fetch line items with product details
        const { data: itemsData, error: itemsError } = await supabase
          .from("sale_line_items")
          .select(
            "line_item_id, variant_id, quantity, unit_price, line_total, product_variants(size, color, sku, product_styles(name, image_url))"
          )
          .eq("sale_id", sale.sale_id)

        if (itemsError) {
          console.error("Error fetching line items:", itemsError)
        } else {
          setLineItems(itemsData || [])
        }
      } catch (error) {
        console.error("Error fetching sale details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSaleDetails()
  }, [sale.sale_id, supabase])

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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const canRefund = React.useMemo(() => {
    if (!sale.sale_date) return false
    const saleDate = new Date(sale.sale_date)
    const daysSinceSale = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceSale <= 90
  }, [sale.sale_date])

  const handlePrintReceipt = () => {
    if (!saleDetails) return
    // Create a new window for printing
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    // Generate receipt HTML
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${sale.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .info { margin-bottom: 20px; font-size: 12px; }
            .items { margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
            .totals { border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${sale.stores?.name || "Store"}</h1>
            <p>Thank you for your purchase!</p>
          </div>
          <div class="info">
            <p><strong>Receipt #:</strong> ${sale.receipt_number}</p>
            <p><strong>Date:</strong> ${formatDateTime(sale.sale_date)}</p>
            <p><strong>Payment:</strong> ${(sale.payment_method || "N/A").toUpperCase()}</p>
          </div>
          <div class="items">
            ${lineItems.map(item => `
              <div class="item">
                <div>
                  <div><strong>${item.product_variants?.product_styles?.name || "Unknown Product"}</strong></div>
                  <div style="font-size: 10px; color: #666;">
                    ${item.product_variants ? `${item.product_variants.size} / ${item.product_variants.color} - SKU: ${item.product_variants.sku}` : ""}
                  </div>
                  <div style="font-size: 10px; color: #666;">Qty: ${item.quantity || 0}</div>
                </div>
                <div>${formatPrice(item.line_total)}</div>
              </div>
            `).join("")}
          </div>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatPrice(saleDetails.subtotal)}</span>
            </div>
            ${saleDetails.tax_total && saleDetails.tax_total > 0 ? `
            <div class="total-row">
              <span>Tax (16%):</span>
              <span>${formatPrice(saleDetails.tax_total)}</span>
            </div>
            ` : ""}
            <div class="total-row" style="font-weight: bold; font-size: 16px;">
              <span>Total:</span>
              <span>${formatPrice(saleDetails.grand_total)}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>Please come again</p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(receiptHtml)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleRefund = () => {
    // TODO: Implement refund logic
    alert("Refund functionality coming soon")
  }


  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Details - {sale.receipt_number}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500 dark:text-zinc-400">Loading sale details...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sale Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Date/Time</div>
                <div className="font-medium">{formatDateTime(sale.sale_date)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Store</div>
                <div className="font-medium">{sale.stores?.name || "N/A"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Cashier</div>
                <div className="font-medium">
                  {sale.staff
                    ? `${sale.staff.first_name || ""} ${sale.staff.last_name || ""}`.trim() || "N/A"
                    : "N/A"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Payment Method</div>
                <div className="font-medium capitalize">{sale.payment_method || "N/A"}</div>
              </div>
              {sale.customers && (
                <div className="space-y-2 md:col-span-2">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Customer</div>
                  <div className="font-medium">
                    {sale.customers.first_name || ""} {sale.customers.last_name || ""}
                    {sale.customers.phone && ` - ${sale.customers.phone}`}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Line Items</h3>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-zinc-500 dark:text-zinc-400">
                          No line items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      lineItems.map((item) => (
                        <TableRow key={item.line_item_id}>
                          <TableCell className="font-medium">
                            {item.product_variants?.product_styles?.name || "Unknown Product"}
                          </TableCell>
                          <TableCell>
                            {item.product_variants
                              ? `${item.product_variants.size} / ${item.product_variants.color}`
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-zinc-500 dark:text-zinc-400">
                            {item.product_variants?.sku || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity || 0}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(item.line_total)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            {saleDetails && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
                    <span className="font-medium">{formatPrice(saleDetails.subtotal)}</span>
                  </div>
                  {saleDetails.tax_total && saleDetails.tax_total > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Tax</span>
                      <span className="font-medium">{formatPrice(saleDetails.tax_total)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold">{formatPrice(saleDetails.grand_total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrintReceipt} className="flex-1">
                <Printer className="mr-2 h-4 w-4" />
                Reprint Receipt
              </Button>
              {canRefund && (
                <Button variant="outline" onClick={handleRefund} className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Process Refund
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
