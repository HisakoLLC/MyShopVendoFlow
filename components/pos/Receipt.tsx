"use client"

import * as React from "react"
import { CartItem } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/format-currency"
import { StorageImage } from "@/components/StorageImage"

interface ReceiptProps {
  receiptNumber: string
  cart: CartItem[]
  subtotal: number
  taxAmount: number
  total: number
  paymentMethod: string
  storeId: string | null
  storeName?: string | null
  businessName?: string | null
  businessAddress?: string | null
  businessPhone?: string | null
  /** When true, show logo at top (from settings) */
  logoUrl?: string | null
  /** Custom header line (e.g. "Thank you for your purchase!") */
  receiptHeader?: string | null
  /** Custom footer lines (e.g. "Thank you for shopping with us!") */
  receiptFooter?: string | null
  /** Return policy text from settings */
  returnPolicy?: string | null
  /** Currency code for amounts (e.g. KES, USD) */
  currency?: string
  /** When true, prices are inclusive of tax; receipt shows breakdown */
  taxInclusive?: boolean
  /** Tax rate as percentage (e.g. 16) for display */
  taxRatePercent?: number
}

export function Receipt({
  receiptNumber,
  cart,
  subtotal,
  taxAmount,
  total,
  paymentMethod,
  storeId,
  storeName: storeNameProp,
  businessName,
  businessAddress,
  businessPhone,
  logoUrl,
  receiptHeader,
  receiptFooter,
  returnPolicy,
  currency = "KES",
  taxInclusive = false,
  taxRatePercent = 16,
}: ReceiptProps) {
  const [storeName, setStoreName] = React.useState<string>(storeNameProp?.trim() || "Store")
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    async function fetchStoreName() {
      if (storeNameProp?.trim()) return
      if (!storeId) return

      const { data, error } = await supabase
        .from("stores")
        .select("name")
        .eq("store_id", storeId)
        .single()

      if (!error && data) {
        setStoreName(data.name)
      }
    }

    fetchStoreName()
  }, [storeId, storeNameProp, supabase])

  const formatPrice = (price: number) =>
    formatCurrency(price, currency, { maximumFractionDigits: 0 })

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-KE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const displaySubtotal = taxInclusive ? total / (1 + taxRatePercent / 100) : subtotal
  const displayTax = taxInclusive ? total - displaySubtotal : taxAmount
  const displayTotal = total

  return (
    <div className="mx-auto max-w-md bg-background-card-light p-6 print:p-4 print:bg-white dark:bg-background-card-dark" id="receipt">
      {/* Logo - when enabled in settings; StorageImage handles signed URLs for Supabase storage */}
      {logoUrl && (
        <div className="mb-4 flex justify-center border-b border-zinc-200 pb-4">
          <div className="relative h-20 w-40">
            <StorageImage
              src={logoUrl}
              alt="Store logo"
              width={160}
              height={80}
              className="h-full w-full object-contain object-center"
            />
          </div>
        </div>
      )}

      {/* Receipt Header */}
      <div className={`border-b-2 border-zinc-900 pb-4 text-center ${logoUrl ? "" : "mb-4"}`}>
        <h1 className="text-xl font-bold text-zinc-900">
          {storeName?.trim() || businessName?.trim() || "Receipt"}
        </h1>
        {(businessName?.trim() || businessAddress?.trim() || businessPhone?.trim()) && (
          <div className="mt-1 text-xs text-zinc-600 space-y-0.5">
            {businessName?.trim() && <p>{businessName.trim()}</p>}
            {businessAddress?.trim() && <p>{businessAddress.trim()}</p>}
            {businessPhone?.trim() && <p>{businessPhone.trim()}</p>}
          </div>
        )}
        <p className="mt-1 text-sm text-zinc-600">
          {receiptHeader?.trim() || "Thank you for your purchase!"}
        </p>
      </div>

      {/* Receipt Info */}
      <div className="mb-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-600">Store:</span>
          <span className="font-medium text-zinc-900">{storeName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Receipt #:</span>
          <span className="font-medium text-zinc-900">{receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Date:</span>
          <span className="font-medium text-zinc-900">{formatDate(new Date())}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Payment:</span>
          <span className="font-medium capitalize text-zinc-900">{paymentMethod}</span>
        </div>
      </div>

      {/* Items */}
      <div className="mb-4 border-t border-zinc-300 pt-4">
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.cartItemId} className="flex justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium text-zinc-900">{item.styleName}</p>
                <p className="text-xs text-zinc-600">
                  {item.size} / {item.color} - SKU: {item.sku}
                </p>
                <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
              </div>
              <div className="ml-4 text-right">
                <p className="font-medium text-zinc-900">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="mb-4 border-t-2 border-zinc-900 pt-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">
              {taxInclusive ? "Subtotal (ex tax):" : "Subtotal:"}
            </span>
            <span className="text-zinc-900">{formatPrice(displaySubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Tax ({taxRatePercent}%):</span>
            <span className="text-zinc-900">{formatPrice(displayTax)}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-300 pt-2 text-base font-bold">
            <span className="text-zinc-900">Total:</span>
            <span className="text-zinc-900">{formatPrice(displayTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-300 pt-4 text-center text-xs text-zinc-600">
        {receiptFooter?.trim() ? (
          receiptFooter.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1" : ""}>
              {line}
            </p>
          ))
        ) : (
          <>
            <p>Thank you for shopping with us!</p>
            <p className="mt-1">Please come again</p>
          </>
        )}
        {returnPolicy?.trim() && (
          <p className="mt-3 text-zinc-500">{returnPolicy.trim()}</p>
        )}
      </div>

      {/* Powered by */}
      <p className="mt-4 text-center text-[10px] text-zinc-500">
        Powered by <span style={{ color: "#6b0005" }}>VendoFlow</span>
      </p>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt,
          #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      ` }} />
    </div>
  )
}
