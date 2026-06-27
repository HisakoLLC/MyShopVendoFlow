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
    <div className="mx-auto max-w-md bg-card text-card-foreground border border-border rounded-lg p-6 shadow-sm print:border-none print:bg-white print:text-black print:shadow-none print:p-4" id="receipt">
      {/* Logo - when enabled in settings; StorageImage handles signed URLs for Supabase storage */}
      {logoUrl && (
        <div className="mb-4 flex justify-center border-b border-border print:border-black pb-4">
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
      <div className={`border-b border-border print:border-black pb-4 text-center ${logoUrl ? "" : "mb-4"}`}>
        <h1 className="font-sans text-xl font-bold tracking-tight text-foreground print:text-black">
          {storeName?.trim() || businessName?.trim() || "Receipt"}
        </h1>
        {(businessName?.trim() || businessAddress?.trim() || businessPhone?.trim()) && (
          <div className="mt-1 text-xs text-muted-foreground print:text-gray-600 space-y-0.5">
            {businessName?.trim() && <p>{businessName.trim()}</p>}
            {businessAddress?.trim() && <p>{businessAddress.trim()}</p>}
            {businessPhone?.trim() && <p>{businessPhone.trim()}</p>}
          </div>
        )}
        <p className="mt-1 text-sm text-muted-foreground print:text-gray-600">
          {receiptHeader?.trim() || "Thank you for your purchase!"}
        </p>
      </div>

      {/* Receipt Info */}
      <div className="mb-4 space-y-0.5 text-sm">
        <div className="flex justify-between py-2 border-b border-border print:border-gray-300">
          <span className="text-muted-foreground print:text-gray-600">Store:</span>
          <span className="font-semibold text-foreground print:text-black">{storeName}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-border print:border-gray-300">
          <span className="text-muted-foreground print:text-gray-600">Receipt #:</span>
          <span className="font-semibold text-foreground print:text-black">{receiptNumber}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-border print:border-gray-300">
          <span className="text-muted-foreground print:text-gray-600">Date:</span>
          <span className="font-semibold text-foreground print:text-black">{formatDate(new Date())}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-border print:border-gray-300">
          <span className="text-muted-foreground print:text-gray-600">Payment:</span>
          <span className="font-semibold capitalize text-foreground print:text-black">{paymentMethod}</span>
        </div>
      </div>

      {/* Items */}
      <div className="mb-4 border-t border-border print:border-black pt-4">
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.cartItemId} className="flex justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium text-foreground print:text-black">{item.styleName}</p>
                <p className="text-xs text-muted-foreground print:text-gray-600">
                  {item.size} / {item.color} - SKU: {item.sku}
                </p>
                <p className="text-xs text-muted-foreground print:text-gray-500">Qty: {item.quantity}</p>
              </div>
              <div className="ml-4 text-right">
                <p className="font-mono text-sm font-medium text-foreground print:text-black tabular-nums">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="mb-4 border-t-2 border-foreground print:border-black pt-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground print:text-gray-600">
              {taxInclusive ? "Subtotal (ex tax):" : "Subtotal:"}
            </span>
            <span className="font-mono text-foreground print:text-black tabular-nums">{formatPrice(displaySubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground print:text-gray-600">Tax ({taxRatePercent}%):</span>
            <span className="font-mono text-foreground print:text-black tabular-nums">{formatPrice(displayTax)}</span>
          </div>
          <div className="flex justify-between border-t border-border print:border-black pt-2 text-base font-bold">
            <span className="text-foreground print:text-black">Total:</span>
            <span className="font-mono text-foreground print:text-black tabular-nums">{formatPrice(displayTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border print:border-black pt-4 text-center text-xs text-muted-foreground print:text-gray-600">
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
          <p className="mt-3 text-muted-foreground print:text-gray-500">{returnPolicy.trim()}</p>
        )}
      </div>

      {/* Powered by */}
      <p className="mt-4 text-center text-[10px] text-muted-foreground print:text-gray-500">
        Powered by <span className="text-[#E8400C] print:text-black font-semibold">VendoFlow</span>
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
