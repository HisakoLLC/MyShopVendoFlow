"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import { toast } from "sonner"
import { processRefund } from "@/app/sales/actions"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

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

type RefundMethod = "cash" | "mpesa" | "card"

export function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  const [lineItems, setLineItems] = React.useState<SaleLineItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [saleDetails, setSaleDetails] = React.useState<{
    subtotal: number
    tax_total: number | null
    grand_total: number | null
  } | null>(null)
  const [showReceipt, setShowReceipt] = React.useState(false)
  const [showRefundDialog, setShowRefundDialog] = React.useState(false)
  const [refundMethod, setRefundMethod] = React.useState<RefundMethod>("cash")
  const [isRefunding, setIsRefunding] = React.useState(false)
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
    if (sale.status === "refunded") return false
    if (!sale.sale_date) return false
    const saleDate = new Date(sale.sale_date)
    const daysSinceSale = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceSale <= 90
  }, [sale.sale_date, sale.status])

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
          <title>Receipt ${sale.receipt_number ?? ""}</title>
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
            <p><strong>Receipt #:</strong> ${sale.receipt_number ?? "—"}</p>
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
              <span>${formatPrice(saleDetails.grand_total ?? 0)}</span>
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

  const handleOpenRefund = () => {
    setRefundMethod((sale.payment_method?.toLowerCase() as RefundMethod) || "cash")
    setShowRefundDialog(true)
  }

  const handleConfirmRefund = async () => {
    setIsRefunding(true)
    try {
      const result = await processRefund({
        sale_id: sale.sale_id,
        refund_method: refundMethod,
      })
      if (result.success) {
        toast.success("Refund processed successfully. Inventory has been restored.")
        setShowRefundDialog(false)
        onClose()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process refund")
    } finally {
      setIsRefunding(false)
    }
  }


  return (
    <>
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col p-0 [&>button]:hidden overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="font-editorial text-lg font-bold text-zinc-50">
            Sale Details - <span className="font-mono">{sale.receipt_number ?? "—"}</span>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-sm hover:bg-zinc-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <div className="text-zinc-500">Loading sale details...</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
              {/* Sale Info */}
            <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="space-y-1">
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Date/Time</div>
                <div className="text-sm font-semibold text-zinc-100">{formatDateTime(sale.sale_date)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Store</div>
                <div className="text-sm font-semibold text-zinc-100">{sale.stores?.name || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Cashier</div>
                <div className="text-sm font-semibold text-zinc-100">
                  {sale.staff
                    ? `${sale.staff.first_name || ""} ${sale.staff.last_name || ""}`.trim() || "N/A"
                    : "N/A"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Payment Method</div>
                <div className="text-sm font-semibold text-zinc-100 capitalize">{sale.payment_method || "N/A"}</div>
              </div>
              {sale.payment_method?.toLowerCase() === "mpesa" && sale.notes?.trim() && (
                <div className="space-y-1 col-span-2 md:col-span-2">
                  <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">M-Pesa details</div>
                  <div className="font-mono text-sm font-semibold text-zinc-100">
                    {sale.notes.trim()}
                  </div>
                </div>
              )}
              {sale.customers && (
                <div className="space-y-1 col-span-2 md:col-span-2">
                  <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Customer</div>
                  <div className="text-sm font-semibold text-zinc-100">
                    {sale.customers.first_name || ""} {sale.customers.last_name || ""}
                    {sale.customers.phone && ` - ${sale.customers.phone}`}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="flex-1 flex flex-col">
              <h3 className="font-editorial text-base font-bold text-zinc-50 px-6 pt-4 pb-2">Line Items</h3>
              <div className="overflow-x-hidden w-full">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-[28%] text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-2">Product</TableHead>
                      <TableHead className="w-[18%] text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-2">Variant</TableHead>
                      <TableHead className="w-[18%] text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-2">SKU</TableHead>
                      <TableHead className="w-[8%] text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-2 text-center">Qty</TableHead>
                      <TableHead className="w-[14%] text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-2 text-right">Unit Price</TableHead>
                      <TableHead className="w-[14%] text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-2 text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.length === 0 ? (
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableCell colSpan={6} className="text-center text-zinc-500 px-3 py-6">
                          No line items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      lineItems.map((item) => (
                        <TableRow key={item.line_item_id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                          <TableCell className="text-sm font-semibold text-zinc-100 px-3 py-2 truncate">
                            {item.product_variants?.product_styles?.name || "Unknown Product"}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-400 px-3 py-2 truncate">
                            {item.product_variants
                              ? `${item.product_variants.size} / ${item.product_variants.color}`
                              : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400 px-3 py-2 truncate">
                            {item.product_variants?.sku || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-300 tabular-nums text-center px-3 py-2">
                            {item.quantity || 0}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-400 tabular-nums text-right px-3 py-2">
                            {formatPrice(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-zinc-100 tabular-nums text-right px-3 py-2">
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
              <div className="border-t border-zinc-800 px-6 py-4 mt-auto shrink-0 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Subtotal</span>
                  <span className="text-sm text-zinc-300 tabular-nums">{formatPrice(saleDetails.subtotal)}</span>
                </div>
                {saleDetails.tax_total && saleDetails.tax_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Tax</span>
                    <span className="text-sm text-zinc-300 tabular-nums">{formatPrice(saleDetails.tax_total)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-700 my-2" />
                <div className="flex justify-between align-middle items-center">
                  <span className="text-sm font-semibold text-zinc-100">Total</span>
                  <span className="font-editorial text-xl font-bold text-zinc-50 tabular-nums">{formatPrice(saleDetails.grand_total ?? 0)}</span>
                </div>
              </div>
            )}
          </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-zinc-800 flex flex-wrap sm:flex-nowrap items-center gap-3 flex-shrink-0">
              <button type="button" onClick={handlePrintReceipt} className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 rounded-sm h-9 px-4 text-xs font-semibold tracking-[0.1em] uppercase flex-1 transition-colors flex items-center justify-center">
                <Printer className="mr-2 h-4 w-4" />
                Reprint Receipt
              </button>
              {canRefund && (
                <button type="button" onClick={handleOpenRefund} className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-sm h-9 px-4 text-xs font-semibold tracking-[0.1em] uppercase flex-1 transition-colors flex items-center justify-center">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Process Refund
                </button>
              )}
              <button type="button" onClick={onClose} className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-4 text-xs font-semibold tracking-[0.1em] uppercase flex-1 transition-colors">
                Close
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
      <DialogContent className="!z-[60] bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-md p-0 overflow-hidden [&>button]:hidden">
        <div className="px-6 pt-6 pb-0 relative">
          <div className="font-editorial text-xl font-bold text-zinc-900">Process Refund</div>
          <button type="button" onClick={() => setShowRefundDialog(false)} className="absolute top-6 right-6 w-8 h-8 rounded-sm border border-zinc-200 bg-white hover:bg-zinc-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-zinc-600 leading-relaxed mb-4">
            Refund full amount of{" "}
            <span className="font-semibold text-zinc-900">
              {saleDetails ? formatPrice(saleDetails.grand_total ?? 0) : ""}
            </span>{" "}
            for receipt {sale.receipt_number ?? "—"}? Inventory will be restored for all items.
          </p>
          <div>
            <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mt-4 mb-2">Refund method</div>
            <RadioGroup
              value={refundMethod}
              onValueChange={(v) => setRefundMethod(v as RefundMethod)}
              className="flex flex-wrap gap-3"
            >
              {[
                { id: "cash", label: "Cash" },
                { id: "mpesa", label: "M-Pesa" },
                { id: "card", label: "Card" },
              ].map((method) => {
                const isSelected = refundMethod === method.id
                return (
                  <label
                    key={method.id}
                    className={cn(
                      "border rounded-lg px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors flex items-center justify-center",
                      isSelected 
                        ? "border-zinc-900 bg-zinc-900 text-white" 
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
                    )}
                  >
                    <RadioGroupItem value={method.id} id={`refund-${method.id}`} className="sr-only" />
                    {method.label}
                  </label>
                )
              })}
            </RadioGroup>
          </div>
        </div>
        <div className="px-6 pb-6 pt-4 flex gap-3">
          <button
            type="button"
            className="flex-1 border border-zinc-200 text-zinc-700 hover:border-zinc-400 rounded-sm h-10 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
            onClick={() => setShowRefundDialog(false)}
            disabled={isRefunding}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 bg-red-600 text-white hover:bg-red-700 rounded-sm h-10 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
            onClick={handleConfirmRefund}
            disabled={isRefunding || !saleDetails?.grand_total}
          >
            {isRefunding ? "Processing…" : "Confirm Refund"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
