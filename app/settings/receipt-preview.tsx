"use client"

import * as React from "react"
import { StorageImage } from "@/components/StorageImage"

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
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-sm max-w-[320px] mx-auto overflow-hidden">
      <div className="font-mono text-xs uppercase tracking-tighter leading-tight text-zinc-300">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-4 flex justify-center">
            <StorageImage
              src={logoUrl}
              alt="Logo"
              width={64}
              height={64}
              className="w-16 h-16 object-contain grayscale opacity-80"
            />
          </div>
        )}

        {/* Business Name */}
        <div className="mb-2 text-center font-bold text-sm tracking-normal text-zinc-100">
          {businessName || "Your Business Name"}
        </div>

        {/* Header */}
        {header && (
          <div className="mb-4 text-center whitespace-pre-line text-zinc-500">{header}</div>
        )}

        <div className="mb-4 border-t border-dashed border-zinc-800"></div>

        {/* Receipt Number */}
        <div className="flex justify-between mb-1">
          <span className="text-zinc-500">Receipt #:</span>
          <span>RCP-2024-001234</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-zinc-500">Date:</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-zinc-500">Time:</span>
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="mb-4 border-t border-dashed border-zinc-800"></div>

        {/* Items */}
        <div className="mb-4 space-y-3">
          {sampleItems.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between font-bold text-zinc-100">
                <span className="flex-1">{item.name}</span>
                <span className="ml-2">{(item.price * item.qty).toLocaleString()}</span>
              </div>
              <div className="text-zinc-500 text-[10px]">
                {item.qty} x {item.price.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 border-t border-zinc-800"></div>

        {/* Totals */}
        <div className="space-y-1 mb-4">
          <div className="flex justify-between">
            <span className="text-zinc-500">Subtotal</span>
            <span>{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Tax (16%)</span>
            <span>{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-zinc-800 pt-2 mt-2 tracking-normal text-zinc-100">
            <span>TOTAL KES</span>
            <span>{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="mb-4 border-t border-dashed border-zinc-800"></div>

        {/* Payment Method */}
        <div className="mb-4 flex justify-between">
          <span className="text-zinc-500">Method:</span>
          <span>Cash</span>
        </div>

        {/* Footer */}
        {footer && (
          <div className="mb-4 text-center whitespace-pre-line text-zinc-500">{footer}</div>
        )}

        {/* Return Policy */}
        {returnPolicy && (
          <div className="mb-4 pt-4 border-t border-dashed border-zinc-800">
            <div className="text-center font-bold mb-1 text-zinc-100">Return Policy</div>
            <div className="text-center lowercase tracking-normal text-zinc-500">{returnPolicy}</div>
          </div>
        )}

        <div className="mt-8 text-center text-[10px] tracking-widest text-zinc-600">
          *** Thank You ***
        </div>
      </div>
    </div>
  )
}
