"use client"

import * as React from "react"
import { Minus, Plus, ShoppingCart, X, ArrowRight } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { CheckoutModal } from "./CheckoutModal"
import { StorageImage } from "@/components/StorageImage"
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
import { formatCurrency } from "@/lib/format-currency"
import { cn } from "@/lib/utils"

interface CartProps {
  defaultStoreId: string | null
}

export function Cart({ defaultStoreId }: CartProps) {
  const {
    cart,
    removeFromCart,
    clearCart,
    updateQuantity,
    subtotal,
    taxAmount,
    total,
    taxRatePercent,
    taxInclusive,
  } = useCart()
  const [showCheckout, setShowCheckout] = React.useState(false)
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)
  const [stockByVariant, setStockByVariant] = React.useState<Record<string, number>>({})
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    if (!defaultStoreId || cart.length === 0) {
      setStockByVariant({})
      return
    }
    const variantIds = [...new Set(cart.map((i) => i.variantId))]
    ;(async () => {
      const { data, error } = await supabase
        .from("inventory_levels")
        .select("variant_id, quantity_on_hand")
        .eq("store_id", defaultStoreId)
        .in("variant_id", variantIds)
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
  }, [defaultStoreId, supabase, cart])

  React.useEffect(() => {
    if (!defaultStoreId || Object.keys(stockByVariant).length === 0) return
    cart.forEach((item) => {
      const available = stockByVariant[item.variantId] ?? 0
      if (item.quantity > available) {
        updateQuantity(item.cartItemId, available)
      }
    })
  }, [defaultStoreId, stockByVariant, cart, updateQuantity])

  const handleClearCart = () => {
    clearCart()
    setShowClearConfirm(false)
  }

  return (
    <>
      <div className="flex h-full flex-col p-6">
        {/* Header: Cart + count badge, Clear All */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Cart
            <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-primary-600 px-2 py-0.5 text-sm font-medium text-white">
              {cart.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => cart.length > 0 && setShowClearConfirm(true)}
            disabled={cart.length === 0}
            className={cn(
              "text-sm font-medium text-danger-600 hover:text-danger-700 dark:text-danger-500 dark:hover:text-danger-400",
              cart.length === 0 && "cursor-not-allowed opacity-50"
            )}
          >
            Clear All
          </button>
        </div>

        {/* Cart Items — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: "50vh" }}>
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <ShoppingCart className="h-10 w-10" aria-hidden />
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Cart is empty
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Add products to create a sale
              </p>
            </div>
          ) : (
            <ul className="space-y-0">
              {cart.map((item) => (
                <li
                  key={item.cartItemId}
                  className="relative flex gap-4 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800"
                >
                  {/* Remove — 32x32 tap target */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="absolute right-0 top-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-danger-500/10 hover:text-danger-600 dark:hover:text-danger-400"
                    aria-label="Remove item"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Image 60x60 */}
                  <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    {item.imageUrl ? (
                      <StorageImage
                        src={item.imageUrl}
                        alt={item.styleName}
                        width={60}
                        height={60}
                        className="h-[60px] w-[60px] object-cover"
                      />
                    ) : (
                      <div className="flex h-[60px] w-[60px] items-center justify-center text-slate-400">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Details + Price */}
                  <div className="min-w-0 flex-1 pr-10">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                      {item.styleName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {item.size} / {item.color}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-r-none text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-l-none text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                          onClick={() => {
                            const available = defaultStoreId
                              ? (stockByVariant[item.variantId] ?? 0)
                              : Infinity
                            updateQuantity(
                              item.cartItemId,
                              Math.min(item.quantity + 1, available)
                            )
                          }}
                          disabled={
                            !!defaultStoreId &&
                            item.quantity >= (stockByVariant[item.variantId] ?? 0)
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Totals + Checkout — sticky bottom */}
        {cart.length > 0 && (
          <div className="mt-4 shrink-0 border-t-2 border-slate-200 bg-white pt-6 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>{taxInclusive ? "Subtotal (ex tax)" : "Subtotal"}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>Tax ({taxRatePercent}%)</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatCurrency(taxAmount)}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Total
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Checkout — 56px height, primary, ArrowRight */}
            <Button
              size="lg"
              className={cn(
                "mt-6 h-14 w-full gap-2 bg-primary-600 text-lg font-semibold text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700",
                "active:scale-[0.98] transition-transform",
                cart.length === 0 && "cursor-not-allowed opacity-50"
              )}
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
            >
              Checkout
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        )}
      </div>

      {showCheckout && (
        <CheckoutModal storeId={defaultStoreId} onClose={() => setShowCheckout(false)} />
      )}

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove all items from the cart? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCart}
              className="bg-danger-600 hover:bg-danger-700"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
