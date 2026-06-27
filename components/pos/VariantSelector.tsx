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
      <DialogContent className="bg-card text-card-foreground rounded-xl border border-border shadow-2xl w-[calc(100vw-320px-2rem)] max-w-3xl flex flex-col p-0 max-h-[92vh] overflow-hidden [&>button]:hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <DialogTitle className="font-sans text-xl font-bold tracking-tight text-foreground">{styleName}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Select size and color</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-sm border border-border bg-background hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading variants...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading variants</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        ) : variants.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              No variants configured for this product
            </p>
          </div>
        ) : (
          <div>
            <div className="w-full">
              <div
                className="grid gap-2.5 w-full"
                style={{
                  gridTemplateColumns: `2.5rem repeat(${colors.length}, 1fr)`,
                }}
              >
                {/* Headers */}
                <div></div>
                {colors.map((color) => (
                  <div
                    key={color}
                    className="text-[0.6rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-center pb-2"
                  >
                    {color}
                  </div>
                ))}

                {/* Rows */}
                {matrix.map((row, rowIndex) => (
                  <React.Fragment key={sizes[rowIndex]}>
                    {/* Row Header */}
                    <div className="text-sm font-semibold text-foreground flex items-center justify-center w-10 flex-shrink-0">
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
                            className="bg-muted/30 border border-border rounded-lg p-3 min-h-[68px] flex flex-col justify-center opacity-50 w-full box-border"
                          >
                            <span className="text-sm text-muted-foreground text-center">—</span>
                          </div>
                        )
                      }

                      let cellClass = ""
                      let stockTextClass = ""
                      let priceTextClass = ""

                      if (!isAvailable) {
                        cellClass = "bg-muted/30 border border-border rounded-lg p-3 min-h-[68px] cursor-not-allowed flex flex-col justify-center text-left w-full box-border"
                        stockTextClass = "text-xs text-muted-foreground"
                        priceTextClass = "font-mono tabular-nums text-sm text-muted-foreground mt-0.5"
                      } else if (isSelected) {
                        cellClass = "bg-[#E8400C] border border-[#E8400C] rounded-lg p-3 min-h-[68px] cursor-pointer flex flex-col justify-center text-left w-full box-border shadow-md"
                        stockTextClass = "text-xs font-medium text-white/90"
                        priceTextClass = "font-mono tabular-nums text-sm font-bold text-white mt-0.5"
                      } else {
                        cellClass = "bg-card border border-border rounded-lg p-3 min-h-[68px] cursor-pointer hover:border-[#E8400C] hover:bg-accent transition-colors duration-150 flex flex-col justify-center text-left w-full box-border"
                        stockTextClass = "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        priceTextClass = "font-mono tabular-nums text-sm font-bold text-foreground mt-0.5"
                      }

                      return (
                        <button
                          key={`${cell.size}-${cell.color}`}
                          type="button"
                          disabled={!isAvailable}
                          onPointerDown={(e) => handleCellPointerDown(e, cell)}
                          onClick={(e) => handleCellClick(e, cell)}
                          className={`${cellClass} touch-manipulation`}
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
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
