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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-editorial text-2xl font-bold flex items-center gap-2 text-zinc-50">
                  {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Customer"}
                  {customer.is_vip && (
                    <Crown className="h-4 w-4 text-zinc-100" />
                  )}
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Customer details and purchase history
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Info */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-1">Email</div>
                <div className="font-mono text-sm text-zinc-300">
                  {customer.email || "—"}
                </div>
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-1">Phone</div>
                <div className="text-sm text-zinc-300">
                  {customer.phone || "—"}
                </div>
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-1">First Purchase</div>
                <div className="text-sm text-zinc-300">
                  {formatDate(customer.first_purchase_date)}
                </div>
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-1">Last Purchase</div>
                <div className="text-sm text-zinc-300">
                   {formatDate(customer.last_purchase_date)}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">Total Spend</div>
                  <div className="font-editorial text-3xl font-bold tabular-nums text-zinc-50">
                    {formatPrice(customer.total_spend)}
                  </div>
                </div>
                <div>
                  <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">Transactions</div>
                  <div className="font-editorial text-3xl font-bold tabular-nums text-zinc-50">
                    {customer.transaction_count || 0}
                  </div>
                </div>
                <div>
                  <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">Avg Basket</div>
                  <div className="font-editorial text-3xl font-bold tabular-nums text-zinc-50">
                    {formatPrice(avgBasketSize)}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-6 bg-zinc-900">
              <div>
                <Label htmlFor="vip-toggle" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">
                  Tag as VIP
                </Label>
                <p className="text-sm text-zinc-400 mt-1">
                  VIP customers receive special treatment and discounts
                </p>
              </div>
              <Switch
                id="vip-toggle"
                checked={isVip}
                onCheckedChange={handleVIPToggle}
                disabled={isUpdatingVIP}
                className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-800"
              />
            </div>

            {/* Purchase History */}
            <div>
              <h3 className="mb-4 font-editorial text-xl font-bold text-zinc-50">
                Purchase History
              </h3>
              {isLoadingHistory ? (
                <div className="text-center py-8 text-sm text-zinc-500">
                  Loading...
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-800/20 p-8 text-center">
                  <p className="text-sm text-zinc-500">No purchase history</p>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-900">
                      <TableRow className="border-b border-zinc-700 hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Date</TableHead>
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Receipt #</TableHead>
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Store</TableHead>
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">Total</TableHead>
                        <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseHistory.map((sale) => (
                        <TableRow key={sale.sale_id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
                          <TableCell className="px-4 py-3 text-sm text-zinc-300">{formatDate(sale.sale_date)}</TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="font-mono text-xs text-zinc-400 tracking-wide">{sale.receipt_number}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-zinc-300">{sale.stores?.name || "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <span className="font-editorial text-lg font-bold tabular-nums text-zinc-50">{formatPrice(sale.grand_total)}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <Link href={`/sales?receipt=${sale.receipt_number}`}>
                              <Button variant="ghost" size="sm" className="h-8 rounded-sm text-zinc-400 hover:text-white hover:bg-zinc-800">
                                View
                              </Button>
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
            <div className="pt-6 border-t border-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <Label htmlFor="notes" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">
                  Notes
                </Label>
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || notes === (customer.notes || "")}
                  className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-100"
                >
                  {isSavingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>
              <Textarea
                id="notes"
                placeholder="Add notes about this customer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] bg-zinc-800 border-zinc-700 text-zinc-100 rounded-sm"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
