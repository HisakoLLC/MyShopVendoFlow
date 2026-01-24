"use client"

import * as React from "react"
import { CartItem } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/client"

interface ReceiptProps {
  receiptNumber: string
  cart: CartItem[]
  subtotal: number
  taxAmount: number
  total: number
  paymentMethod: string
  storeId: string | null
}

export function Receipt({
  receiptNumber,
  cart,
  subtotal,
  taxAmount,
  total,
  paymentMethod,
  storeId,
}: ReceiptProps) {
  const [storeName, setStoreName] = React.useState<string>("Store")
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    async function fetchStoreName() {
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
  }, [storeId, supabase])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-KE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="mx-auto max-w-md bg-white p-6 print:p-4" id="receipt">
      {/* Receipt Header */}
      <div className="mb-4 border-b-2 border-zinc-900 pb-4 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">{storeName}</h1>
        <p className="mt-1 text-sm text-zinc-600">Thank you for your purchase!</p>
      </div>

      {/* Receipt Info */}
      <div className="mb-4 space-y-1 text-sm">
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
            <span className="text-zinc-600">Subtotal:</span>
            <span className="text-zinc-900">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Tax (16%):</span>
            <span className="text-zinc-900">{formatPrice(taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-300 pt-2 text-base font-bold">
            <span className="text-zinc-900">Total:</span>
            <span className="text-zinc-900">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-300 pt-4 text-center text-xs text-zinc-600">
        <p>Thank you for shopping with us!</p>
        <p className="mt-1">Please come again</p>
      </div>

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
