"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCart, CartItem } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/client"
import { Receipt } from "./Receipt"
import { toast } from "sonner"
import { ensureStaffForCurrentUser } from "@/app/pos/actions"
import { formatCurrency } from "@/lib/format-currency"
import { createServerSupabaseClient } from "@/lib/supabase/server"

interface CheckoutModalProps {
  storeId: string | null
  accountId?: string | null
  onClose: () => void
}

type PaymentMethod = "cash" | "mpesa" | "card"
type Step = 1 | 2 | 3

type ReceiptSettings = {
  logoUrl: string | null
  receiptHeader: string | null
  receiptFooter: string | null
  returnPolicy: string | null
  currency: string
  taxInclusive: boolean
  taxRatePercent: number
}

type ReceiptSnapshot = {
  cart: CartItem[]
  subtotal: number
  taxAmount: number
  total: number
}

export function CheckoutModal({ storeId, accountId: accountIdProp, onClose }: CheckoutModalProps) {
  const { cart, subtotal, taxAmount, total, clearCart } = useCart()
  const [currentStep, setCurrentStep] = React.useState<Step>(1)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash")
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = React.useState("")
  const [mpesaConfirmationCode, setMpesaConfirmationCode] = React.useState("")
  const [amountTendered, setAmountTendered] = React.useState("")
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [customerResults, setCustomerResults] = React.useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = React.useState<string | null>(null)
  const [isSearchingCustomers, setIsSearchingCustomers] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [receiptNumber, setReceiptNumber] = React.useState<string | null>(null)
  const [showReceipt, setShowReceipt] = React.useState(false)
  const [receiptSettings, setReceiptSettings] = React.useState<ReceiptSettings>({
    logoUrl: null,
    receiptHeader: null,
    receiptFooter: null,
    returnPolicy: null,
    currency: "KES",
    taxInclusive: false,
    taxRatePercent: 16,
  })
  const [receiptSnapshot, setReceiptSnapshot] = React.useState<ReceiptSnapshot | null>(null)

  const supabase = React.useMemo(() => createClient(), [])

  // Fetch business_settings and store tax_rate for receipt and sale calculation
  // Use accountId from server when provided (staff); otherwise resolve via get_account_id (owner)
  React.useEffect(() => {
    if (!storeId) return
    let cancelled = false
    async function load() {
      let aid: string | null = accountIdProp ?? null
      if (!aid) {
        const { data: accountId } = await supabase.rpc("get_account_id")
        aid = Array.isArray(accountId) ? accountId[0] : (accountId && typeof accountId === "object" && "account_id" in accountId ? (accountId as { account_id: string }).account_id : accountId)
      }
      if (!aid) return
      const [settingsRes, storeRes] = await Promise.all([
        supabase.from("business_settings").select("logo_url, logo_on_receipt, receipt_header, receipt_footer, return_policy, currency, tax_inclusive").eq("account_id", aid).single(),
        supabase.from("stores").select("tax_rate").eq("store_id", storeId).single(),
      ])
      if (cancelled) return
      const taxRate = (storeRes.data as { tax_rate: number | null } | null)?.tax_rate ?? 16
      const bs = settingsRes.data as { logo_url?: string | null; logo_on_receipt?: boolean | null; receipt_header?: string | null; receipt_footer?: string | null; return_policy?: string | null; currency?: string | null; tax_inclusive?: boolean | null } | null
      setReceiptSettings({
        logoUrl: bs?.logo_on_receipt && bs?.logo_url ? bs.logo_url : null,
        receiptHeader: bs?.receipt_header ?? null,
        receiptFooter: bs?.receipt_footer ?? null,
        returnPolicy: bs?.return_policy ?? null,
        currency: bs?.currency ?? "KES",
        taxInclusive: bs?.tax_inclusive ?? false,
        taxRatePercent: taxRate,
      })
    }
    load()
    return () => { cancelled = true }
  }, [storeId, accountIdProp, supabase])

  // Cart context already computes correct subtotal/tax/total for both tax-inclusive and -exclusive
  const displaySubtotal = subtotal
  const displayTax = taxAmount
  const displayTotal = total

  const change = React.useMemo(() => {
    if (paymentMethod === "cash" && amountTendered) {
      const tendered = parseFloat(amountTendered)
      return tendered >= displayTotal ? tendered - displayTotal : 0
    }
    return 0
  }, [paymentMethod, amountTendered, displayTotal])

  // Search customers as user types
  React.useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) {
      setCustomerResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingCustomers(true)
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("customer_id, first_name, last_name, phone, email")
          .or(`phone.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%`)
          .limit(5)

        if (error) {
          console.error("Error searching customers:", error)
          setCustomerResults([])
        } else {
          setCustomerResults(data || [])
        }
      } catch (error) {
        console.error("Error searching customers:", error)
        setCustomerResults([])
      } finally {
        setIsSearchingCustomers(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [customerSearch, supabase])

  const formatPrice = (price: number) =>
    formatCurrency(price, receiptSettings.currency, { maximumFractionDigits: 0 })

  // Resolve cashier_id: prefer user_metadata.staff_id (set after PIN login / bind-staff) so the actual cashier is recorded
  const getCashierIdForCurrentUser = async (): Promise<string | null> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return null
    // PIN login sets user_metadata.staff_id via bind-staff — use it so sales show the real cashier
    const metaStaffId = user.user_metadata?.staff_id as string | undefined
    if (metaStaffId && typeof metaStaffId === "string") return metaStaffId
    if (!user.email) return null
    const { data: accountId } = await supabase.rpc("get_account_id")
    const aid = Array.isArray(accountId) ? accountId[0] : accountId
    if (!aid) return null
    const { data: staffRow } = await supabase
      .from("staff")
      .select("staff_id")
      .eq("account_id", aid)
      .ilike("email", user.email.trim())
      .eq("active", true)
      .limit(1)
      .maybeSingle()
    return staffRow?.staff_id ?? null
  }

  async function generateReceiptNumber(accountId: string) {
    const supabase = await createServerSupabaseClient()
  
    try {
      console.log("[Receipt] Generating receipt for account:", accountId)
  
      const { data, error } = await supabase.rpc(
        "get_next_receipt_number",
        { p_account_id: accountId }
      )
  
      console.log("[Receipt] RPC raw response:", { data, error })
  
      if (error) {
        console.error("[Receipt] RPC error:", error)
        throw new Error("RPC failed")
      }
  
      let nextNumber: number | null = null
  
      /**
       * Supabase can return:
       * - number
       * - bigint
       * - [{ get_next_receipt_number: number }]
       */
      if (typeof data === "number") {
        nextNumber = data
      } else if (typeof data === "bigint") {
        nextNumber = Number(data)
      } else if (typeof data === "string") {
        nextNumber = Number(data)
      } else if (Array.isArray(data) && data.length > 0) {
        const value = Object.values(data[0])[0]
        nextNumber = Number(value)
      }
      
  
      if (!nextNumber || Number.isNaN(nextNumber)) {
        console.error("[Receipt] Invalid receipt number:", data)
        throw new Error("Invalid receipt number")
      }
  
      const year = new Date().getFullYear()
      const formatted = `RC-${year}-${String(nextNumber).padStart(5, "0")}`
  
      console.log("[Receipt] Generated receipt number:", formatted)
  
      return formatted
    } catch (err) {
      console.error("[Receipt] FAILED to generate receipt:", err)
      throw new Error("Failed to generate receipt")
    }
  }
  

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate payment method
      if (!paymentMethod) {
        toast.error("Please select a payment method")
        return
      }
      if (paymentMethod === "mpesa") {
        // Manual M-Pesa: require a confirmation code (no STK push configured yet)
        if (!mpesaConfirmationCode.trim()) {
          toast.error("Please enter the M-Pesa confirmation code")
          return
        }
        // Phone number optional, but validate if provided
        if (mpesaPhoneNumber.trim()) {
          const phoneRegex = /^254\d{9}$/
          if (!phoneRegex.test(mpesaPhoneNumber.trim())) {
            toast.error("Invalid phone number. Must be 12 digits starting with 254 (e.g., 254712345678)")
            return
          }
        }
      }
      if (paymentMethod === "cash") {
        const tendered = parseFloat(amountTendered)
        const minTendered = Math.round(total)
        if (!amountTendered || isNaN(tendered) || tendered < minTendered) {
          toast.error(`Amount tendered must be at least ${formatPrice(displayTotal)}`)
          return
        }
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  // M-Pesa is currently handled as a manual payment (no STK push configured).

  // Complete sale after payment confirmation
  const completeSale = async (saleId: string, receiptNum: string) => {
    try {
      // Decrement inventory
      const { data: lineItems } = await supabase
        .from("sale_line_items")
        .select("variant_id, quantity")
        .eq("sale_id", saleId)

      if (lineItems && storeId) {
        for (const item of lineItems) {
          if (!item.variant_id || !item.quantity) continue
          
          const { data: inventory } = await supabase
            .from("inventory_levels")
            .select("inventory_id, quantity_on_hand")
            .eq("variant_id", item.variant_id)
            .eq("store_id", storeId)
            .single()

          if (inventory) {
            const newQuantity = Math.max(0, (inventory.quantity_on_hand || 0) - item.quantity)
            await supabase
              .from("inventory_levels")
              .update({ quantity_on_hand: newQuantity })
              .eq("inventory_id", inventory.inventory_id)
          }
        }
      }

      // Update customer stats
      if (selectedCustomer) {
        const { data: customer } = await supabase
          .from("customers")
          .select("total_spend, transaction_count, first_purchase_date")
          .eq("customer_id", selectedCustomer)
          .single()

        if (customer) {
          const newTotalSpend = (customer.total_spend || 0) + total
          const newTransactionCount = (customer.transaction_count || 0) + 1
          const firstPurchaseDate = customer.first_purchase_date || new Date().toISOString()

          await supabase
            .from("customers")
            .update({
              total_spend: newTotalSpend,
              transaction_count: newTransactionCount,
              last_purchase_date: new Date().toISOString(),
              first_purchase_date: firstPurchaseDate,
            })
            .eq("customer_id", selectedCustomer)
        }
      }

      // Success! Capture receipt data before clearing cart so the receipt shows correct items and totals
      setReceiptSnapshot({
        cart: [...cart],
        subtotal: displaySubtotal,
        taxAmount: displayTax,
        total: displayTotal,
      })
      setReceiptNumber(receiptNum)
      clearCart()
      setShowReceipt(true)
      setIsProcessing(false)
    } catch (error) {
      console.error("Error completing sale:", error)
      toast.error("Sale completed but there was an error updating inventory/customer stats")
    }
  }

  const handleProcessSale = async () => {
    if (!storeId) {
      toast.error("Store ID is required")
      return
    }

    setIsProcessing(true)

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("User not authenticated")
      }

      let cashierId = await getCashierIdForCurrentUser()
      if (!cashierId) cashierId = await ensureStaffForCurrentUser()

      // Generate receipt number
      const receiptNum = await generateReceiptNumber(storeId)
      setReceiptNumber(receiptNum)

      const saleNotes =
        paymentMethod === "mpesa"
          ? `M-Pesa Confirmation: ${mpesaConfirmationCode.trim()}${mpesaPhoneNumber.trim() ? ` (Phone: ${mpesaPhoneNumber.trim()})` : ""}`
          : null

      // Create sale record (use display values for tax_inclusive correctness)
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          store_id: storeId,
          cashier_id: cashierId,
          customer_id: selectedCustomer,
          subtotal: displaySubtotal,
          tax_total: displayTax,
          grand_total: displayTotal,
          payment_method: paymentMethod,
          receipt_number: receiptNum,
          notes: saleNotes,
          status: "completed",
          sale_date: new Date().toISOString(),
        })
        .select("sale_id")
        .single()

      if (saleError || !sale) {
        throw new Error(saleError?.message || "Failed to create sale")
      }

      const rate = receiptSettings.taxRatePercent / 100
      const lineItems = cart.map((item) => {
        const lineTotal = item.price * item.quantity
        const lineTax = receiptSettings.taxInclusive ? lineTotal - lineTotal / (1 + rate) : lineTotal * rate
        return {
          sale_id: sale.sale_id,
          variant_id: item.variantId,
          quantity: item.quantity,
          unit_price: item.price,
          tax_amount: lineTax,
          line_total: lineTotal,
        }
      })

      const { error: lineItemsError } = await supabase
        .from("sale_line_items")
        .insert(lineItems)

      if (lineItemsError) {
        throw new Error(lineItemsError.message || "Failed to create line items")
      }

      // Decrement inventory for each variant
      for (const item of cart) {
        const { data: inventory, error: invError } = await supabase
          .from("inventory_levels")
          .select("inventory_id, quantity_on_hand")
          .eq("variant_id", item.variantId)
          .eq("store_id", storeId)
          .single()

        if (invError && invError.code !== "PGRST116") {
          // PGRST116 = no rows returned, which is okay (inventory might not exist)
          console.warn(`Inventory not found for variant ${item.variantId}:`, invError)
        } else if (inventory) {
          const newQuantity = Math.max(0, (inventory.quantity_on_hand || 0) - item.quantity)
          const { error: updateError } = await supabase
            .from("inventory_levels")
            .update({ quantity_on_hand: newQuantity })
            .eq("inventory_id", inventory.inventory_id)

          if (updateError) {
            console.warn(`Failed to update inventory for variant ${item.variantId}:`, updateError)
            // Continue processing - fashion boutiques often oversell
          }
        }
      }

      // Update customer stats if customer is linked
      if (selectedCustomer) {
        const { data: customer, error: custError } = await supabase
          .from("customers")
          .select("total_spend, transaction_count, first_purchase_date")
          .eq("customer_id", selectedCustomer)
          .single()

        if (!custError && customer) {
          const newTotalSpend = (customer.total_spend || 0) + total
          const newTransactionCount = (customer.transaction_count || 0) + 1
          const firstPurchaseDate = customer.first_purchase_date || new Date().toISOString()

          await supabase
            .from("customers")
            .update({
              total_spend: newTotalSpend,
              transaction_count: newTransactionCount,
              last_purchase_date: new Date().toISOString(),
              first_purchase_date: firstPurchaseDate,
            })
            .eq("customer_id", selectedCustomer)
        }
      }

      // Success! Capture receipt data before clearing cart so the receipt shows correct items and totals
      setReceiptSnapshot({
        cart: [...cart],
        subtotal: displaySubtotal,
        taxAmount: displayTax,
        total: displayTotal,
      })
      clearCart()
      setShowReceipt(true)
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process sale")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = () => {
    window.print()
  }

  if (showReceipt && receiptNumber) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Completed!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Receipt #{receiptNumber}
            </p>
            <div className="print:block overflow-y-auto max-h-[60vh]">
              <Receipt
                receiptNumber={receiptNumber}
                cart={receiptSnapshot?.cart ?? []}
                subtotal={receiptSnapshot?.subtotal ?? 0}
                taxAmount={receiptSnapshot?.taxAmount ?? 0}
                total={receiptSnapshot?.total ?? 0}
                paymentMethod={paymentMethod}
                storeId={storeId}
                logoUrl={receiptSettings.logoUrl}
                receiptHeader={receiptSettings.receiptHeader}
                receiptFooter={receiptSettings.receiptFooter}
                returnPolicy={receiptSettings.returnPolicy}
                currency={receiptSettings.currency}
                taxInclusive={receiptSettings.taxInclusive}
                taxRatePercent={receiptSettings.taxRatePercent}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Done
              </Button>
              <Button onClick={handlePrintReceipt} className="flex-1">
                Print Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Sale</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  currentStep >= step
                    ? "border-primary bg-primary text-white dark:border-primary dark:bg-primary dark:text-white"
                    : "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`h-0.5 w-12 ${
                    currentStep > step
                      ? "bg-zinc-900 dark:bg-zinc-100"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Payment Method */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block text-sm font-medium">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="cursor-pointer">
                    Cash
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mpesa" id="mpesa" />
                  <Label htmlFor="mpesa" className="cursor-pointer">
                    M-Pesa (Manual)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="cursor-pointer">
                    Card
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === "mpesa" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="mpesa-code">M-Pesa Confirmation Code *</Label>
                  <Input
                    id="mpesa-code"
                    value={mpesaConfirmationCode}
                    onChange={(e) => {
                      setMpesaConfirmationCode(e.target.value.toUpperCase())
                    }}
                    placeholder="e.g. QGH5X9K2AB"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Enter the confirmation code from the customer's M-Pesa message.
                  </p>
                </div>

                <div>
                  <Label htmlFor="mpesa-phone">Customer Phone Number (optional)</Label>
                  <Input
                    id="mpesa-phone"
                    type="tel"
                    value={mpesaPhoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "")
                      if (value.length <= 12) setMpesaPhoneNumber(value)
                    }}
                    placeholder="254712345678"
                    maxLength={12}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Format: 254712345678 (12 digits, starts with 254)
                  </p>
                </div>
              </div>
            )}

            {paymentMethod === "cash" && (
              <div>
                <Label htmlFor="amount-tendered">Amount Tendered</Label>
                <Input
                  id="amount-tendered"
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="0.00"
                  min={total}
                  step="0.01"
                  className="mt-1"
                />
                {change > 0 && (
                  <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                    Change: {formatPrice(change)}
                  </p>
                )}
              </div>
            )}

            {paymentMethod === "card" && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Please process payment on the card terminal.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleNext}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 2: Customer Info */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-search">Customer Phone/Email (optional)</Label>
              <Input
                id="customer-search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by phone or email..."
                className="mt-1"
              />

              {isSearchingCustomers && (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Searching...</p>
              )}

              {customerResults.length > 0 && (
                <div className="mt-2 space-y-1 rounded-lg border border-zinc-200 bg-background dark:border-zinc-800 dark:bg-background">
                  {customerResults.map((customer) => (
                    <button
                      key={customer.customer_id}
                      onClick={() => {
                        setSelectedCustomer(customer.customer_id)
                        setCustomerSearch(
                          `${customer.first_name || ""} ${customer.last_name || ""} - ${
                            customer.phone || customer.email
                          }`.trim()
                        )
                        setCustomerResults([])
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      {customer.first_name} {customer.last_name} - {customer.phone || customer.email}
                    </button>
                  ))}
                </div>
              )}

              {selectedCustomer && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  Customer linked: {customerSearch}
                </p>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Skip
                </Button>
                <Button onClick={handleNext}>Next</Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm & Process */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Order Summary</h3>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.cartItemId} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.styleName}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {item.size} / {item.color} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{formatPrice(displaySubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Tax</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{formatPrice(displayTax)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(displayTotal)}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <p>
                  <span className="text-zinc-600 dark:text-zinc-400">Payment:</span>{" "}
                  <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
                    {paymentMethod}
                  </span>
                </p>
                {selectedCustomer && (
                  <p>
                    <span className="text-zinc-600 dark:text-zinc-400">Customer:</span>{" "}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {customerSearch}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
                Back
              </Button>
              <Button
                onClick={handleProcessSale}
                disabled={
                  isProcessing ||
                  (paymentMethod === "mpesa" && !mpesaConfirmationCode.trim())
                }
                size="lg"
                className="flex-1"
              >
                {isProcessing ? "Processing..." : "Confirm Sale"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
