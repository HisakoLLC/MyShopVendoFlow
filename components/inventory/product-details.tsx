"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"

export type ProductDetailsProps = {
  product: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (id: string) => void
}

export function ProductDetails({ product, open, onOpenChange, onEdit }: ProductDetailsProps) {
  if (!product) return null

  const stockStatus = () => {
    if (product.quantity <= 0)
      return { label: "Out of Stock", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" }
    if (product.quantity < 10)
      return { label: "Low Stock", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" }
    return { label: "In Stock", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" }
  }

  const status = stockStatus()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Product Details</span>
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>SKU: {product.sku}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {product.image_url && (
              <div className="flex justify-center items-center">
                <div className="relative h-40 w-40 rounded-md overflow-hidden">
                  <Image
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/diverse-products-still-life.png"
                    }}
                  />
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{product.name}</h3>
                {product.category && (
                  <Badge variant="outline" className="mt-1">
                    {product.category}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Selling Price</p>
                  <p className="font-medium">{formatCurrency(product.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cost Price</p>
                  <p className="font-medium">{formatCurrency(product.cost_price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{product.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                  <p className="font-medium">
                    {(((product.price - product.cost_price) / product.price) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {product.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{product.description}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 sticky bottom-0 pt-2 bg-background">
          <Button onClick={() => onEdit(product.id)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Product
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
