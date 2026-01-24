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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Customer"}
                  {customer.is_vip && (
                    <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
                      <Crown className="mr-1 h-3 w-3" />
                      VIP
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Customer details and purchase history
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Email</div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {customer.email || "—"}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Phone</div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {customer.phone || "—"}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">First Purchase</div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDate(customer.first_purchase_date)}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Last Purchase</div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDate(customer.last_purchase_date)}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Spend</div>
                  <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(customer.total_spend)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Transaction Count</div>
                  <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {customer.transaction_count || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Avg Basket Size</div>
                  <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(avgBasketSize)}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <Label htmlFor="vip-toggle" className="text-base font-medium">
                  Tag as VIP
                </Label>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  VIP customers receive special treatment and discounts
                </p>
              </div>
              <Switch
                id="vip-toggle"
                checked={isVip}
                onCheckedChange={handleVIPToggle}
                disabled={isUpdatingVIP}
              />
            </div>

            {/* Purchase History */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Purchase History
              </h3>
              {isLoadingHistory ? (
                <div className="text-center py-8 text-sm text-zinc-600 dark:text-zinc-400">
                  Loading...
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">No purchase history</p>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseHistory.map((sale) => (
                        <TableRow key={sale.sale_id}>
                          <TableCell>{formatDate(sale.sale_date)}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{sale.receipt_number}</span>
                          </TableCell>
                          <TableCell>{sale.stores?.name || "—"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(sale.grand_total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/sales?receipt=${sale.receipt_number}`}>
                              <Button variant="ghost" size="sm">
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
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="notes" className="text-base font-medium">
                  Notes
                </Label>
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || notes === (customer.notes || "")}
                >
                  {isSavingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>
              <Textarea
                id="notes"
                placeholder="Add notes about this customer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
