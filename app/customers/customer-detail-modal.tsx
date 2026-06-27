"use client"

import * as React from "react"
import Link from "next/link"
import { Crown, X } from "lucide-react"
import { toast, Toaster } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { updateCustomerVIP, updateCustomerNotes } from "./actions"
import { createClient } from "@/lib/supabase/client"

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

type Sale = {
  sale_id: string
  receipt_number: string
  sale_date: string | null
  grand_total: number
  stores: {
    name: string
  } | null
}

type CustomerDetailModalProps = {
  customer: Customer
  onClose: () => void
  onUpdate: () => void
}

export function CustomerDetailModal({
  customer,
  onClose,
  onUpdate,
}: CustomerDetailModalProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const [isVip, setIsVip] = React.useState(customer.is_vip || false)
  const [notes, setNotes] = React.useState(customer.notes || "")
  const [isSavingNotes, setIsSavingNotes] = React.useState(false)
  const [isUpdatingVIP, setIsUpdatingVIP] = React.useState(false)
  const [purchaseHistory, setPurchaseHistory] = React.useState<Sale[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true)

  // Fetch purchase history
  React.useEffect(() => {
    async function fetchHistory() {
      setIsLoadingHistory(true)
      try {
        // First get account stores to filter sales
        const { data: accountId } = await supabase.rpc("get_account_id")
        if (!accountId) return

        const { data: stores } = await supabase
          .from("stores")
          .select("store_id")
          .eq("account_id", accountId)

        const storeIds = (stores || []).map((s: { store_id: string }) => s.store_id)
        if (storeIds.length === 0) {
          setIsLoadingHistory(false)
          return
        }

        const { data: sales, error } = await supabase
          .from("sales")
          .select(
            `
            sale_id,
            receipt_number,
            sale_date,
            grand_total,
            stores!inner(name)
          `
          )
          .eq("customer_id", customer.customer_id)
          .in("store_id", storeIds)
          .order("sale_date", { ascending: false })
          .limit(50)

        if (!error && sales) {
          setPurchaseHistory(sales as Sale[])
        }
      } catch (err) {
        console.error("Error fetching purchase history:", err)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [customer.customer_id, supabase])

  const formatPrice = (amount: number | null): string => {
    if (amount === null || amount === undefined) return "KES 0"
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const avgBasketSize =
    customer.transaction_count && customer.transaction_count > 0
      ? (customer.total_spend || 0) / customer.transaction_count
      : 0

  const handleVIPToggle = async (checked: boolean) => {
    setIsVip(checked)
    setIsUpdatingVIP(true)
    try {
      await updateCustomerVIP(customer.customer_id, checked)
      toast.success(checked ? "Customer tagged as VIP" : "VIP tag removed")
      onUpdate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update VIP status.")
      setIsVip(!checked) // Revert on error
    } finally {
      setIsUpdatingVIP(false)
    }
  }

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      await updateCustomerNotes(customer.customer_id, notes)
      toast.success("Notes saved successfully")
      onUpdate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save notes.")
    } finally {
      setIsSavingNotes(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-background border border-border text-foreground rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col p-0 [&>button]:hidden overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-start justify-between flex-shrink-0">
            <div>
              <div className="font-sans text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Customer"}
                {customer.is_vip && (
                  <Crown className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Customer details and purchase history
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1">Email</div>
                <div className="text-sm text-foreground">
                  {customer.email || "—"}
                </div>
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1">Phone</div>
                <div className="font-mono text-sm text-foreground">
                  {customer.phone || "—"}
                </div>
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1">First Purchase</div>
                <div className="text-sm text-foreground">
                  {formatDate(customer.first_purchase_date)}
                </div>
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1">Last Purchase</div>
                <div className="text-sm text-foreground">
                   {formatDate(customer.last_purchase_date)}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-3 gap-4 mb-5 shadow-sm">
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1">Total Spend</div>
                <div className="font-mono text-2xl font-bold text-foreground tabular-nums">
                  {formatPrice(customer.total_spend)}
                </div>
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1">Transactions</div>
                <div className="font-mono text-2xl font-bold text-foreground tabular-nums">
                  {customer.transaction_count || 0}
                </div>
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1">Avg Basket</div>
                <div className="font-mono text-2xl font-bold text-foreground tabular-nums">
                  {formatPrice(avgBasketSize)}
                </div>
              </div>
            </div>

            {/* VIP Toggle */}
            <div className="bg-card border border-border rounded-lg p-4 mb-5 flex items-center justify-between shadow-sm">
              <div>
                <Label htmlFor="vip-toggle" className="text-sm font-semibold text-foreground cursor-pointer block">
                  Tag as VIP
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  VIP customers receive special treatment and discounts
                </p>
              </div>
              <Switch
                id="vip-toggle"
                checked={isVip}
                onCheckedChange={handleVIPToggle}
                disabled={isUpdatingVIP}
                className="data-[state=unchecked]:!bg-muted data-[state=checked]:!bg-[#E8400C] border-transparent shadow-inner"
              />
            </div>

            {/* Purchase History */}
            <div className="mb-5">
              <h3 className="font-sans text-lg font-bold tracking-tight text-foreground mb-3">
                Purchase History
              </h3>
              {isLoadingHistory ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
                  <p className="text-sm text-muted-foreground">No purchase history</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                  <Table className="w-full">
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Date</TableHead>
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Receipt #</TableHead>
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Store</TableHead>
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Total</TableHead>
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseHistory.map((sale) => (
                        <TableRow key={sale.sale_id} className="border-b border-border last:border-0 hover:bg-accent/50">
                          <TableCell className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{formatDate(sale.sale_date)}</TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="font-mono text-xs text-muted-foreground">{sale.receipt_number}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-muted-foreground">{sale.stores?.name || "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <span className="font-mono text-sm font-semibold text-foreground tabular-nums">{formatPrice(sale.grand_total)}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <Link href={`/sales?receipt=${sale.receipt_number}`}>
                              <button type="button" className="border border-border text-foreground hover:bg-accent rounded-md h-7 px-3 text-xs font-semibold uppercase transition-colors">
                                View
                              </button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="notes" className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground block">
                  Notes
                </Label>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || notes === (customer.notes || "")}
                  className="rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] border-none px-3 h-7 text-xs font-semibold uppercase disabled:opacity-50 transition-colors"
                >
                  {isSavingNotes ? "Saving..." : "Save Notes"}
                </button>
              </div>
              <Textarea
                id="notes"
                placeholder="Add notes about this customer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border border-border rounded-md text-sm text-foreground p-3 w-full resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] min-h-[80px]"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
