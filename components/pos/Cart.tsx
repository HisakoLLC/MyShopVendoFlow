"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { CheckoutModal } from "./CheckoutModal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CartProps {
  defaultStoreId: string | null
  accountId?: string | null
  storeName?: string
}

export function Cart({ defaultStoreId, accountId, storeName }: CartProps) {
  const { cart, removeFromCart, clearCart, updateQuantity, subtotal, taxAmount, total, taxRatePercent, taxInclusive } = useCart()
  const [showCheckout, setShowCheckout] = React.useState(false)
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)
  const [stockByVariant, setStockByVariant] = React.useState<Record<string, number>>({})

  const supabase = React.useMemo(() => createClient(), [])

  // Fetch available stock for each variant in the cart at the current store
  const variantIdsStr = React.useMemo(() => {
    return [...new Set(cart.map((i) => i.variantId))].sort().join(",")
  }, [cart])

  React.useEffect(() => {
    if (!defaultStoreId || !variantIdsStr) {
      setStockByVariant({})
      return
    }
    
    let isActive = true
    const variantIds = variantIdsStr.split(",")
    
    ;(async () => {
      const { data, error } = await supabase
        .from("inventory_levels")
        .select("variant_id, quantity_on_hand")
        .eq("store_id", defaultStoreId)
        .in("variant_id", variantIds)

      if (!isActive) return

      if (error) {
        setStockByVariant({})
        return
      }
      const map: Record<string, number> = {}
      for (const row of data ?? []) {
        const id = row.variant_id
        const qty = row.quantity_on_hand ?? 0
        map[id] = (map[id] ?? 0) + qty
      }
      setStockByVariant(map)
    })()
    
    return () => {
      isActive = false
    }
  }, [defaultStoreId, supabase, variantIdsStr])

  // When stock data loads, clamp any cart quantity that exceeds available
  React.useEffect(() => {
    if (!defaultStoreId || Object.keys(stockByVariant).length === 0) return
    cart.forEach((item) => {
      if (stockByVariant[item.variantId] !== undefined) {
        const available = stockByVariant[item.variantId]
        if (item.quantity > available) {
          updateQuantity(item.cartItemId, available)
        }
      }
    })
  }, [defaultStoreId, stockByVariant, cart, updateQuantity])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleClearCart = () => {
    clearCart()
    setShowClearConfirm(false)
  }

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Cart Header */}
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
            Cart ({cart.length} {cart.length === 1 ? "item" : "items"})
          </h2>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <svg
                className="mb-4 h-16 w-16 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="mb-1 text-lg font-medium text-foreground">
                Cart is empty
              </p>
              <p className="text-sm text-muted-foreground">
                Start adding products to create a sale
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  className="group relative bg-card border border-border rounded-lg p-4 mb-2"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="absolute right-3 top-3 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                    aria-label="Remove item"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  {/* Item Details */}
                  <div className="pr-8">
                    <h3 className="text-sm font-semibold text-foreground">
                      {item.styleName}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.size} / {item.color}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            className="w-7 h-7 rounded-sm border border-border bg-background text-foreground hover:border-foreground/40 hover:bg-accent transition-colors flex items-center justify-center text-sm shrink-0 font-medium"
                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-sm font-semibold text-foreground w-8 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="w-7 h-7 rounded-sm border border-border bg-background text-foreground hover:border-foreground/40 hover:bg-accent transition-colors flex items-center justify-center text-sm shrink-0 font-medium"
                            onClick={() => {
                              const available = defaultStoreId
                                ? (stockByVariant[item.variantId] ?? 0)
                                : Infinity
                              updateQuantity(item.cartItemId, Math.min(item.quantity + 1, available))
                            }}
                            disabled={
                              !!defaultStoreId &&
                              item.quantity >= (stockByVariant[item.variantId] ?? 0)
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-bold text-foreground tabular-nums shrink-0 mt-2">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                      {defaultStoreId && stockByVariant[item.variantId] != null && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Max in stock: {stockByVariant[item.variantId]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Sticky Bottom */}
        {cart.length > 0 && (
          <div className="border-t-2 border-border bg-card px-5 py-4">
            <div className="space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between text-sm items-center">
                <span className="text-xs text-muted-foreground">
                  {taxInclusive ? "Subtotal (ex tax)" : "Subtotal"}
                </span>
                <span className="font-mono text-sm text-foreground tabular-nums">
                  {formatPrice(subtotal)}
                </span>
              </div>

              {/* Tax */}
              <div className="flex justify-between text-sm items-center">
                <span className="text-xs text-muted-foreground">Tax ({taxRatePercent}%)</span>
                <span className="font-mono text-sm text-foreground tabular-nums">
                  {formatPrice(taxAmount)}
                </span>
              </div>

              {/* Total */}
              <div className="border-t border-border my-2 pt-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-semibold text-foreground">
                    Total
                  </span>
                  <span className="font-mono text-2xl font-bold text-foreground tabular-nums tracking-tight">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                className="mt-3 w-full bg-[#E8400C] text-white hover:bg-[#c73508] rounded-sm h-11 text-xs font-semibold tracking-[0.15em] uppercase transition-colors border-none"
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0}
              >
                Checkout
              </button>

              {/* Clear Cart Button */}
              <button
                type="button"
                className="w-full bg-transparent border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground rounded-sm h-9 text-xs font-semibold tracking-[0.12em] uppercase transition-colors mt-2"
                onClick={() => setShowClearConfirm(true)}
                disabled={cart.length === 0}
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          storeId={defaultStoreId}
          accountId={accountId}
        storeName={storeName}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {/* Clear Cart Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all items from the cart? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCart} className="bg-red-600 hover:bg-red-700">
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
