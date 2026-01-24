"use client"

import * as React from "react"
import { ShoppingCart, Package } from "lucide-react"
import { ProductSearch } from "./ProductSearch"
import { Cart } from "./Cart"
import { useCart } from "@/lib/cart-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type POSMobileLayoutProps = {
  defaultStoreId: string | null
  storeName: string
}

export function POSMobileLayout({ defaultStoreId, storeName }: POSMobileLayoutProps) {
  const { cart } = useCart()
  const [activeTab, setActiveTab] = React.useState<"products" | "cart">("products")
  const [showCartSheet, setShowCartSheet] = React.useState(false)

  // On tablet (md), use tabs. On mobile (< md), use bottom sheet for cart
  const [isTablet, setIsTablet] = React.useState(false)

  React.useEffect(() => {
    const checkSize = () => {
      setIsTablet(window.innerWidth >= 768)
    }
    checkSize()
    window.addEventListener("resize", checkSize)
    return () => window.removeEventListener("resize", checkSize)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
              Point of Sale
            </h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">{storeName}</p>
          </div>
          {/* Mobile: Cart button with badge */}
          {!isTablet && (
            <Sheet open={showCartSheet} onOpenChange={setShowCartSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cart.length > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
                      {cart.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader>
                  <SheetTitle>Cart</SheetTitle>
                  <SheetDescription>Review and checkout your items</SheetDescription>
                </SheetHeader>
                <div className="mt-4 h-full overflow-y-auto">
                  <Cart defaultStoreId={defaultStoreId} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Tablet: Tabs */}
      {isTablet ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "products" | "cart")} className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="cart" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart {cart.length > 0 && `(${cart.length})`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="flex-1 overflow-hidden">
            <div className="h-full">
              <ProductSearch defaultStoreId={defaultStoreId} />
            </div>
          </TabsContent>
          <TabsContent value="cart" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <Cart defaultStoreId={defaultStoreId} />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        // Mobile: Products only (cart in bottom sheet)
        <div className="flex-1 overflow-hidden">
          <ProductSearch defaultStoreId={defaultStoreId} />
        </div>
      )}
    </div>
  )
}
