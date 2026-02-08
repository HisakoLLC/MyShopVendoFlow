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

  // Fetch business settings and store tax rate
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

  const getCashierIdForCurrentUser = async (): Promise<string | null> => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return null
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

  const handleNext = () => {
    if (currentStep === 1) {
      if (!paymentMethod) { toast.error("Please select a payment method"); return }
      if (paymentMethod === "mpesa") {
        if (!mpesaConfirmationCode.trim()) { toast.error("Please enter the M-Pesa confirmation code"); return }
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
        if (!amountTendered || isNaN(tendered) || tendered < displayTotal) {
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
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step)
  }

  // -------------------------
  // NEW: Handle sale using atomic RPC
  // -------------------------
  const handleProcessSale = async () => {
    if (!storeId) {
      toast.error("Store ID is required")
      return
    }
    setIsProcessing(true)
  
    try {
      // ----------------------------
      // 1. Get cashier ID
      // ----------------------------
      let cashierId = await getCashierIdForCurrentUser()
      if (!cashierId) cashierId = await ensureStaffForCurrentUser()
      if (!cashierId) throw new Error("Cannot process sale: cashier ID not found")
  
      // ----------------------------
      // 2. Prepare sale notes
      // ----------------------------
      const saleNotes =
        paymentMethod === "mpesa"
          ? `M-Pesa Confirmation: ${mpesaConfirmationCode.trim()}${
              mpesaPhoneNumber.trim() ? ` (Phone: ${mpesaPhoneNumber.trim()})` : ""
            }`
          : null
  
      // ----------------------------
      // 3. Map CartItem fields to RPC p_items
      // ----------------------------
      const lineItemsForRpc = cart.map((item) => ({
        product_id: item.variantId, // CartItem.variantId → RPC product_id
        quantity: item.quantity,
        unit_price: item.price,
        size: item.size,
        color: item.color,
        sku: item.sku, // optional
      }))
  
      // ----------------------------
      // 4. Call RPC to create sale
      // ----------------------------
      const { data: saleData, error: rpcError } = await supabase.rpc("create_sale_atomic", {
        p_store_id: storeId,
        p_cashier_id: cashierId,
        p_customer_id: selectedCustomer,
        p_subtotal: displaySubtotal,
        p_tax_total: displayTax,
        p_grand_total: displayTotal,
        p_payment_method: paymentMethod,
        p_notes: saleNotes,
        p_items: lineItemsForRpc, // <-- mapped cart items
      })
  
      if (rpcError || !saleData || !saleData[0]?.sale_id || !saleData[0]?.receipt_number) {
        throw new Error(rpcError?.message || "Failed to create sale")
      }
  
      const receiptNum = saleData[0].receipt_number
      const saleId = saleData[0].sale_id
      setReceiptNumber(receiptNum)
  
      // ----------------------------
      // 5. Capture receipt snapshot
      // ----------------------------
      setReceiptSnapshot({
        cart: [...cart],
        subtotal: displaySubtotal,
        taxAmount: displayTax,
        total: displayTotal,
      })
  
      // ----------------------------
      // 6. Clear cart & show receipt
      // ----------------------------
      clearCart()
      setShowReceipt(true)
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process sale")
    } finally {
      setIsProcessing(false)
    }
  }
  
  

  const handlePrintReceipt = () => window.print()

  // -------------------------
  // Render receipt view if sale completed
  // -------------------------
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

  // -------------------------
  // Render checkout modal steps (1-3)
  // -------------------------
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


        
    