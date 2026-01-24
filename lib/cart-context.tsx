"use client"

import * as React from "react"
import { v4 as uuidv4 } from "uuid"

export interface CartItem {
  cartItemId: string // UUID, unique per cart item
  variantId: string
  styleName: string
  size: string
  color: string
  price: number
  quantity: number // Always 1 for fashion, but support qty for future
  sku: string
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, "cartItemId" | "quantity">, quantity?: number) => void
  removeFromCart: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  subtotal: number
  taxAmount: number
  total: number
}

const CartContext = React.createContext<CartContextType | undefined>(undefined)

const TAX_RATE = 0.16 // 16% VAT (Kenya)
const STORAGE_KEY = "vendoflow_cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartItem[]>([])

  // Load cart from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[]
        setCart(parsed)
      }
    } catch (error) {
      console.error("Error loading cart from localStorage:", error)
    }
  }, [])

  // Save cart to localStorage on every change
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } catch (error) {
      console.error("Error saving cart to localStorage:", error)
    }
  }, [cart])

  const addToCart = React.useCallback(
    (item: Omit<CartItem, "cartItemId" | "quantity">, quantity: number = 1) => {
      setCart((prev) => {
        const newItem: CartItem = {
          ...item,
          cartItemId: uuidv4(),
          quantity,
        }
        return [...prev, newItem]
      })
    },
    []
  )

  const removeFromCart = React.useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId))
  }, [])

  const updateQuantity = React.useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId)
      return
    }
    setCart((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity } : item))
    )
  }, [removeFromCart])

  const clearCart = React.useCallback(() => {
    setCart([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error("Error clearing cart from localStorage:", error)
    }
  }, [])

  const subtotal = React.useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  )

  const taxAmount = React.useMemo(() => subtotal * TAX_RATE, [subtotal])

  const total = React.useMemo(() => subtotal + taxAmount, [subtotal, taxAmount])

  const value = React.useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      subtotal,
      taxAmount,
      total,
    }),
    [cart, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, taxAmount, total]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = React.useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
