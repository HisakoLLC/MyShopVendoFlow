"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"

interface VariantSelectorProps {
  styleId: string
  styleName: string
  currentStoreId: string
  /** Fallback when variant has no price set (e.g. 0). Used so POS shows style base price until variant is edited. */
  basePrice?: number
  onVariantSelect: (variantId: string, size: string, color: string, price: number) => void
  onClose: () => void
}

interface VariantWithStock {
  variant_id: string
  size: string
  color: string
  price: number
  sku: string
  stock: number
}

interface MatrixCell {
  variant: VariantWithStock | null
  size: string
  color: string
}

export function VariantSelector({
  styleId,
  styleName,
  currentStoreId,
  basePrice = 0,
  onVariantSelect,
  onClose,
}: VariantSelectorProps) {
  const [variants, setVariants] = React.useState<VariantWithStock[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const supabase = React.useMemo(() => createClient(), [])

  // Fetch variants with inventory levels
  React.useEffect(() => {
    async function fetchVariants() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch all variants for this style
        const { data: variantsData, error: variantsError } = await supabase
          .from("product_variants")
          .select("variant_id, size, color, price, sku")
          .eq("style_id", styleId)
          .order("size")
          .order("color")

        if (variantsError) {
          throw new Error(variantsError.message)
        }

        if (!variantsData || variantsData.length === 0) {
          setVariants([])
          setIsLoading(false)
          return
        }

        // Fetch inventory levels for these variants at the current store
        const variantIds = variantsData.map((v: { variant_id: string; size: string; color: string; price: number | null; sku: string }) => v.variant_id)
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory_levels")
          .select("variant_id, quantity_on_hand")
          .in("variant_id", variantIds)
          .eq("store_id", currentStoreId)

        if (inventoryError) {
          console.error("Error fetching inventory:", inventoryError)
          // Continue with variants but stock will be 0
        }

        // Create a map of variant_id to stock quantity
        const stockMap = new Map<string, number>()
        ;(inventoryData || []).forEach((item: { variant_id: string | null; quantity_on_hand: number | null }) => {
          if (item.variant_id) {
            stockMap.set(item.variant_id, item.quantity_on_hand ?? 0)
          }
        })

        // Combine variants with stock data; use style base_price when variant price is 0 or null
        const variantsWithStock: VariantWithStock[] = variantsData.map((variant: { variant_id: string; size: string; color: string; price: number | null; sku: string }) => {
          const rawPrice = variant.price ?? 0
          const price = rawPrice > 0 ? rawPrice : basePrice
          return {
            variant_id: variant.variant_id,
            size: variant.size,
            color: variant.color,
            price,
            sku: variant.sku,
            stock: stockMap.get(variant.variant_id) ?? 0,
          }
        })

        setVariants(variantsWithStock)
      } catch (err) {
        console.error("Error fetching variants:", err)
        setError(err instanceof Error ? err.message : "Failed to load variants")
      } finally {
        setIsLoading(false)
      }
    }

    if (styleId && currentStoreId) {
      fetchVariants()
    }
  }, [styleId, currentStoreId, supabase])

  // Build matrix: sizes as rows, colors as columns
  const { matrix, sizes, colors } = React.useMemo(() => {
    if (variants.length === 0) {
      return { matrix: [], sizes: [], colors: [] }
    }

    // Get unique sizes and colors
    const uniqueSizes = [...new Set(variants.map((v: VariantWithStock) => v.size))].sort()
    const uniqueColors = [...new Set(variants.map((v: VariantWithStock) => v.color))].sort()

    // Create a map for quick lookup
    const variantMap = new Map<string, VariantWithStock>()
    variants.forEach((v: VariantWithStock) => {
      variantMap.set(`${v.size}-${v.color}`, v)
    })

    // Build matrix
    const matrix: MatrixCell[][] = uniqueSizes.map((size) =>
      uniqueColors.map((color) => ({
        variant: variantMap.get(`${size}-${color}`) || null,
        size,
        color,
      }))
    )

    return { matrix, sizes: uniqueSizes, colors: uniqueColors }
  }, [variants])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getStockColorClass = (stock: number) => {
    if (stock === 0) {
      return "border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
    }
    if (stock < 3) {
      return "border-yellow-400 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-950/20"
    }
    return "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-950/20"
  }

  const handleCellClick = (cell: MatrixCell) => {
    if (cell.variant && cell.variant.stock > 0) {
      onVariantSelect(
        cell.variant.variant_id,
        cell.variant.size,
        cell.variant.color,
        cell.variant.price
      )
      onClose()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="h-full w-full max-h-[100vh] max-w-full overflow-y-auto border-0 p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg sm:border sm:p-6 md:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{styleName} - Select Size & Color</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500 dark:text-zinc-400">Loading variants...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-red-600 dark:text-red-400">
              <p className="font-medium">Error loading variants</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        ) : variants.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-500 dark:text-zinc-400">
              No variants configured for this product
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Matrix Grid */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 border border-zinc-200 bg-zinc-50 px-4 py-2 text-left text-sm font-semibold dark:border-zinc-800 dark:bg-zinc-900">
                        Size
                      </th>
                      {colors.map((color) => (
                        <th
                          key={color}
                          className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-center text-sm font-semibold dark:border-zinc-800 dark:bg-zinc-900"
                        >
                          {color}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, rowIndex) => (
                      <tr key={sizes[rowIndex]}>
                        <td className="sticky left-0 z-10 border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900">
                          {sizes[rowIndex]}
                        </td>
                        {row.map((cell, colIndex) => {
                          const variant = cell.variant
                          const stock = variant?.stock ?? 0
                          const isAvailable = stock > 0

                          return (
                            <td
                              key={`${cell.size}-${cell.color}`}
                              className="border border-zinc-200 p-1 dark:border-zinc-800"
                            >
                              {variant ? (
                                <button
                                  onClick={() => handleCellClick(cell)}
                                  disabled={!isAvailable}
                                  className={`w-full rounded border-2 p-3 text-left transition-all ${
                                    isAvailable
                                      ? `${getStockColorClass(stock)} hover:scale-105 hover:shadow-md cursor-pointer`
                                      : `${getStockColorClass(stock)} cursor-not-allowed opacity-60`
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div
                                      className={`text-xs font-semibold ${
                                        isAvailable
                                          ? "text-zinc-900 dark:text-zinc-100"
                                          : "text-zinc-500 dark:text-zinc-400"
                                      }`}
                                    >
                                      {stock === 0 ? (
                                        <span>Out of Stock</span>
                                      ) : (
                                        <span>{stock} in stock</span>
                                      )}
                                    </div>
                                    <div
                                      className={`text-sm font-medium ${
                                        isAvailable
                                          ? "text-zinc-700 dark:text-zinc-300"
                                          : "text-zinc-400 dark:text-zinc-500"
                                      }`}
                                    >
                                      {formatPrice(variant.price)}
                                    </div>
                                  </div>
                                </button>
                              ) : (
                                <div className="p-3 text-center text-xs text-zinc-400 dark:text-zinc-600">
                                  —
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-4 text-xs dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border-2 border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-950/20"></div>
                <span className="text-zinc-600 dark:text-zinc-400">In Stock (3+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border-2 border-yellow-400 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-950/20"></div>
                <span className="text-zinc-600 dark:text-zinc-400">Low Stock (1-2)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border-2 border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"></div>
                <span className="text-zinc-600 dark:text-zinc-400">Out of Stock</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
