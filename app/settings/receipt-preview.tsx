"use client"

import * as React from "react"

type ReceiptPreviewProps = {
  businessName: string
  logoUrl: string | null
  header: string
  footer: string
  returnPolicy: string
}

export function ReceiptPreview({
  businessName,
  logoUrl,
  header,
  footer,
  returnPolicy,
}: ReceiptPreviewProps) {
  // Sample receipt data
  const sampleItems = [
    { name: "Blue Denim Jacket", qty: 1, price: 4500 },
    { name: "White Cotton T-Shirt", qty: 2, price: 1200 },
    { name: "Black Leather Boots", qty: 1, price: 8500 },
  ]

  const subtotal = sampleItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tax = subtotal * 0.16 // 16% VAT
  const total = subtotal + tax

  return (
    <div className="rounded-lg border-2 border-zinc-300 bg-background p-4 dark:border-zinc-700 dark:bg-background">
      <div className="font-mono text-xs leading-tight text-zinc-900 dark:text-zinc-100">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-2 flex justify-center">
            <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
          </div>
        )}

        {/* Business Name */}
        <div className="mb-2 text-center font-bold">{businessName || "Your Business Name"}</div>

        {/* Header */}
        {header && (
          <div className="mb-2 text-center text-[10px]">{header}</div>
        )}

        <div className="mb-2 border-t border-dashed border-zinc-400 pt-2"></div>

        {/* Receipt Number */}
        <div className="mb-1">Receipt #: RCP-2024-001234</div>
        <div className="mb-1">Date: {new Date().toLocaleDateString()}</div>
        <div className="mb-2">Time: {new Date().toLocaleTimeString()}</div>

        <div className="mb-2 border-t border-dashed border-zinc-400 pt-2"></div>

        {/* Items */}
        <div className="mb-2">
          {sampleItems.map((item, idx) => (
            <div key={idx} className="mb-1">
              <div className="flex justify-between">
                <span className="flex-1">{item.name}</span>
                <span className="ml-2">KES {item.price.toLocaleString()}</span>
              </div>
              <div className="text-right text-[10px]">
                {item.qty} x {item.price.toLocaleString()} = KES{" "}
                {(item.qty * item.price).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-2 border-t border-dashed border-zinc-400 pt-2"></div>

        {/* Totals */}
        <div className="mb-1 flex justify-between">
          <span>Subtotal:</span>
          <span>KES {subtotal.toLocaleString()}</span>
        </div>
        <div className="mb-1 flex justify-between">
          <span>Tax (16%):</span>
          <span>KES {tax.toFixed(2)}</span>
        </div>
        <div className="mb-2 flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>KES {total.toFixed(2)}</span>
        </div>

        <div className="mb-2 border-t border-dashed border-zinc-400 pt-2"></div>

        {/* Payment Method */}
        <div className="mb-2">Payment: Cash</div>

        {/* Footer */}
        {footer && (
          <>
            <div className="mb-2 text-center text-[10px]">{footer}</div>
            <div className="mb-2 border-t border-dashed border-zinc-400 pt-2"></div>
          </>
        )}

        {/* Return Policy */}
        {returnPolicy && (
          <>
            <div className="mb-1 text-center text-[10px] font-bold">RETURN POLICY</div>
            <div className="mb-2 text-center text-[10px]">{returnPolicy}</div>
          </>
        )}

        <div className="mb-2 border-t border-dashed border-zinc-400 pt-2"></div>

        {/* Thank You */}
        <div className="text-center text-[10px]">Thank you for your business!</div>
      </div>
    </div>
  )
}
