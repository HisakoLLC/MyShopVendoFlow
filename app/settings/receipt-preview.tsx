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
    <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm max-w-[320px] mx-auto overflow-hidden">
      <div className="font-mono text-[11px] uppercase tracking-tighter leading-tight text-zinc-950">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-4 flex justify-center">
            <StorageImage
              src={logoUrl}
              alt="Logo"
              width={64}
              height={64}
              className="w-16 h-16 object-contain grayscale"
            />
          </div>
        )}

        {/* Business Name */}
        <div className="mb-2 text-center font-bold text-sm tracking-normal">
          {businessName || "Your Business Name"}
        </div>

        {/* Header */}
        {header && (
          <div className="mb-4 text-center whitespace-pre-line">{header}</div>
        )}

        <div className="mb-4 border-t border-dashed border-zinc-300"></div>

        {/* Receipt Number */}
        <div className="flex justify-between mb-1">
          <span>Receipt #:</span>
          <span>RCP-2024-001234</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Date:</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span>Time:</span>
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="mb-4 border-t border-dashed border-zinc-300"></div>

        {/* Items */}
        <div className="mb-4 space-y-3">
          {sampleItems.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between font-bold">
                <span className="flex-1">{item.name}</span>
                <span className="ml-2">{(item.price * item.qty).toLocaleString()}</span>
              </div>
              <div className="text-zinc-500">
                {item.qty} x {item.price.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 border-t border-zinc-300"></div>

        {/* Totals */}
        <div className="space-y-1 mb-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (16%)</span>
            <span>{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-zinc-950 pt-2 mt-2 tracking-normal">
            <span>TOTAL KES</span>
            <span>{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="mb-4 border-t border-dashed border-zinc-300"></div>

        {/* Payment Method */}
        <div className="mb-4 flex justify-between">
          <span>Method:</span>
          <span>Cash</span>
        </div>

        {/* Footer */}
        {footer && (
          <div className="mb-4 text-center whitespace-pre-line">{footer}</div>
        )}

        {/* Return Policy */}
        {returnPolicy && (
          <div className="mb-4 pt-4 border-t border-dashed border-zinc-300">
            <div className="text-center font-bold mb-1">Return Policy</div>
            <div className="text-center lowercase tracking-normal">{returnPolicy}</div>
          </div>
        )}

        <div className="mt-8 text-center text-[10px] tracking-widest opacity-50">
          *** Thank You ***
        </div>
      </div>
    </div>
  )
}
