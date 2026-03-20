"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { X } from "lucide-react"

interface VariantSelectorProps {
  styleId: string
  styleName: string
  currentStoreId: string
  /** Fallback when variant has no price set (e.g. 0). Used so POS shows style base price until variant is edited. */
  basePrice?: number
  /** Style-level discount % (0–100). Applied to all variants of this style. */
  discountPercent?: number
  /** When the discount ends (ISO string). Discount only applied if null or in the future. */
  discountEndsAt?: string | null
  onVariantSelect: (variantId: string, size: string, color: string, price: number, sku: string, styleName: string) => void
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
  discountPercent = 0,
  discountEndsAt = null,
  onVariantSelect,
  onClose,
}: VariantSelectorProps) {
  const active = Boolean(
    discountPercent > 0 && (!discountEndsAt || new Date(discountEndsAt) > new Date())
  )
  const [variants, setVariants] = React.useState<VariantWithStock[]>([])
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null)
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

        // Combine variants with stock data; use style base_price when variant price is 0 or null; apply style discount
        const variantsWithStock: VariantWithStock[] = variantsData.map((variant: { variant_id: string; size: string; color: string; price: number | null; sku: string }) => {
          const rawPrice = (variant.price ?? 0) > 0 ? variant.price! : basePrice
          const price = discountPercent > 0 ? Math.round(rawPrice * (1 - discountPercent / 100)) : rawPrice
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
  }, [styleId, currentStoreId, basePrice, discountPercent, discountEndsAt, active, supabase])

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

  const handleCellSelect = React.useCallback(
    (cell: MatrixCell) => {
      if (cell.variant && cell.variant.stock > 0) {
        setSelectedVariantId(cell.variant.variant_id)
        onVariantSelect(
          cell.variant.variant_id,
          cell.variant.size,
          cell.variant.color,
          cell.variant.price,
          cell.variant.sku,
          styleName
        )
      }
    },
    [onVariantSelect, styleName]
  )

  // Avoid double-add when both pointerdown and click fire (mouse/touch)
  const pendingPointerRef = React.useRef<string | null>(null)

  const handleCellPointerDown = (e: React.PointerEvent, cell: MatrixCell) => {
    e.preventDefault()
    e.stopPropagation()
    const key = cell.variant ? `${cell.size}-${cell.color}` : ""
    if (key) {
      pendingPointerRef.current = key
      handleCellSelect(cell)
      setTimeout(() => {
        pendingPointerRef.current = null
      }, 300)
    }
  }

  const handleCellClick = (e: React.MouseEvent, cell: MatrixCell) => {
    if (pendingPointerRef.current !== null) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    handleCellSelect(cell)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-none border border-zinc-200 shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <DialogTitle className="font-editorial text-xl font-bold text-zinc-900">{styleName}</DialogTitle>
            <p className="text-sm text-zinc-500 mt-0.5">Select size and color</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-sm border border-zinc-200 bg-white hover:bg-zinc-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500">Loading variants...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-red-600">
              <p className="font-medium">Error loading variants</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        ) : variants.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-500">
              No variants configured for this product
            </p>
          </div>
        ) : (
          <div>
            {/* Matrix Grid */}
            <div className="overflow-x-auto pb-2">
              <div
                className="grid gap-2 min-w-max"
                style={{
                  gridTemplateColumns: `auto repeat(${colors.length}, minmax(110px, 1fr))`,
                }}
              >
                {/* Headers */}
                <div></div>
                {colors.map((color) => (
                  <div
                    key={color}
                    className="text-xs font-medium uppercase tracking-widest text-zinc-500 text-center pb-3"
                  >
                    {color}
                  </div>
                ))}

                {/* Rows */}
                {matrix.map((row, rowIndex) => (
                  <React.Fragment key={sizes[rowIndex]}>
                    {/* Row Header */}
                    <div className="text-sm font-semibold text-zinc-700 pr-4 flex items-center justify-end w-12">
                      {sizes[rowIndex]}
                    </div>

                    {/* Cells */}
                    {row.map((cell) => {
                      const variant = cell.variant
                      const stock = variant?.stock ?? 0
                      const isAvailable = stock > 0
                      const isSelected = variant ? selectedVariantId === variant.variant_id : false

                      if (!variant) {
                        return (
                          <div
                            key={`${cell.size}-${cell.color}`}
                            className="bg-zinc-50 border border-zinc-100 rounded-sm p-3 flex items-center justify-center opacity-50"
                          >
                            <span className="text-sm text-zinc-300">—</span>
                          </div>
                        )
                      }

                      let cellClass = ""
                      let stockTextClass = ""
                      let priceTextClass = ""

                      if (!isAvailable) {
                        cellClass = "bg-zinc-50 border border-zinc-200 rounded-sm p-3 cursor-not-allowed opacity-50"
                        stockTextClass = "text-xs text-zinc-400"
                        priceTextClass = "text-sm text-zinc-300 tabular-nums"
                      } else if (isSelected) {
                        cellClass = "bg-zinc-900 border-2 border-zinc-900 rounded-lg p-3 cursor-pointer"
                        stockTextClass = "text-xs font-medium text-zinc-400"
                        priceTextClass = "text-sm font-semibold tabular-nums text-white"
                      } else {
                        cellClass = "bg-white border border-zinc-200 rounded-sm p-3 cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all duration-150"
                        stockTextClass = "text-xs font-medium text-zinc-500"
                        priceTextClass = "text-sm font-semibold tabular-nums text-zinc-900"
                      }

                      return (
                        <button
                          key={`${cell.size}-${cell.color}`}
                          type="button"
                          disabled={!isAvailable}
                          onPointerDown={(e) => handleCellPointerDown(e, cell)}
                          onClick={(e) => handleCellClick(e, cell)}
                          className={`${cellClass} flex flex-col items-start gap-1 touch-manipulation text-left`}
                        >
                          <span className={stockTextClass}>
                            {isAvailable ? `${stock} in stock` : "Out of stock"}
                          </span>
                          <span className={priceTextClass}>
                            {formatPrice(variant.price)}
                          </span>
                        </button>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end pt-6 border-t border-zinc-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
