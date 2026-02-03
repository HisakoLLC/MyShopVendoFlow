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

  return (
    <div className="flex h-screen flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-background-card-light px-4 py-3 dark:border-border-dark dark:bg-background-card-dark">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            Point of Sale
          </h1>
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">{storeName}</p>
        </div>
        {/* Mobile (< md): Cart as bottom sheet trigger — min 44px touch target */}
        <div className="md:hidden">
          <Sheet open={showCartSheet} onOpenChange={setShowCartSheet}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative h-11 min-h-[44px] w-11 min-w-[44px]"
                aria-label="Open cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
                    {cart.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
              <SheetHeader>
                <SheetTitle>Cart</SheetTitle>
                <SheetDescription>Review and checkout your items</SheetDescription>
              </SheetHeader>
              <div className="mt-4 h-[calc(85vh-8rem)] overflow-y-auto">
                <Cart defaultStoreId={defaultStoreId} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Tablet (md+): Tabs — Products | Cart */}
      <div className="hidden flex-1 flex-col overflow-hidden md:flex">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "products" | "cart")} className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-4 mt-4 grid w-auto max-w-md grid-cols-2">
            <TabsTrigger value="products" className="min-h-[44px] gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="cart" className="min-h-[44px] gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart {cart.length > 0 && `(${cart.length})`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full">
              <ProductSearch defaultStoreId={defaultStoreId} />
            </div>
          </TabsContent>
          <TabsContent value="cart" className="flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full overflow-y-auto">
              <Cart defaultStoreId={defaultStoreId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile (< md): Products only; cart in bottom sheet */}
      <div className="flex-1 overflow-hidden md:hidden">
        <ProductSearch defaultStoreId={defaultStoreId} />
      </div>
    </div>
  )
}
