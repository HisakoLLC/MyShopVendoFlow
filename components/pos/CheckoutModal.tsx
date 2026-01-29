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

interface CheckoutModalProps {
  storeId: string | null
  onClose: () => void
}

type PaymentMethod = "cash" | "mpesa" | "card"
type Step = 1 | 2 | 3

export function CheckoutModal({ storeId, onClose }: CheckoutModalProps) {
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

  const supabase = React.useMemo(() => createClient(), [])

  // Calculate change for cash payments
  const change = React.useMemo(() => {
    if (paymentMethod === "cash" && amountTendered) {
      const tendered = parseFloat(amountTendered)
      return tendered >= total ? tendered - total : 0
    }
    return 0
  }, [paymentMethod, amountTendered, total])

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Resolve cashier_id: sales.cashier_id must reference staff.staff_id, not auth user id
  const getCashierIdForCurrentUser = async (): Promise<string | null> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user?.email) return null
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

  const generateReceiptNumber = async (storeId: string): Promise<string> => {
    const today = new Date()
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "")
    const storePrefix = "STORE" // Could be dynamic based on store name/code

    // Get today's sales count for this store
    const { data: todaySales, error } = await supabase
      .from("sales")
      .select("receipt_number")
      .eq("store_id", storeId)
      .gte("sale_date", today.toISOString().split("T")[0])
      .order("receipt_number", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error fetching sales:", error)
    }

    // Extract the last number from today's receipts
    let nextNumber = 1
    if (todaySales && todaySales.length > 0) {
      const lastReceipt = todaySales[0].receipt_number
      const match = lastReceipt.match(/-(\d{5})$/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }

    return `${storePrefix}-${dateStr}-${String(nextNumber).padStart(5, "0")}`
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
          toast.error(`Amount tendered must be at least ${formatPrice(total)}`)
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

      // Success!
      clearCart()
      setShowReceipt(true)
      setIsProcessing(false)

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose()
      }, 3000)
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

      // Create sale record
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          store_id: storeId,
          cashier_id: cashierId,
          customer_id: selectedCustomer,
          subtotal: subtotal,
          tax_total: taxAmount,
          grand_total: total,
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

      // Create sale line items
      const lineItems = cart.map((item) => ({
        sale_id: sale.sale_id,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.price,
        tax_amount: (item.price * item.quantity * 0.16) / 1.16, // Tax amount for this line
        line_total: item.price * item.quantity,
      }))

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

      // Success!
      toast.success(`Sale completed! Receipt #${receiptNum}`)
      clearCart()
      setShowReceipt(true)

      // Auto-close after 3 seconds or when user clicks Done
      setTimeout(() => {
        onClose()
      }, 3000)
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
            <div className="hidden print:block">
              <Receipt
                receiptNumber={receiptNumber}
                cart={cart}
                subtotal={subtotal}
                taxAmount={taxAmount}
                total={total}
                paymentMethod={paymentMethod}
                storeId={storeId}
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
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
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
                      const value = e.target.value.replace(/\\D/g, \"\")
                      if (value.length <= 12) setMpesaPhoneNumber(value)
                    }}
                    placeholder=\"254712345678\"
                    maxLength={12}
                    className=\"mt-1\"
                  />
                  <p className=\"mt-1 text-xs text-zinc-500 dark:text-zinc-400\">
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
                <div className="mt-2 space-y-1 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
                  <span className="text-zinc-900 dark:text-zinc-100">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Tax</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{formatPrice(taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(total)}
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
