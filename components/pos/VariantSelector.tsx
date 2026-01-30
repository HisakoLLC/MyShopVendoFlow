"use client"

import * as React from "react"
import { X, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { StorageImage } from "@/components/StorageImage"
import { formatCurrency } from "@/lib/format-currency"
import { cn } from "@/lib/utils"

interface VariantSelectorProps {
  styleId: string
  styleName: string
  currentStoreId: string
  basePrice?: number
  /** Product image for header */
  imageUrl?: string | null
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

const CLOSE_DELAY_MS = 300

export function VariantSelector({
  styleId,
  styleName,
  currentStoreId,
  basePrice = 0,
  imageUrl = null,
  onVariantSelect,
  onClose,
}: VariantSelectorProps) {
  const [variants, setVariants] = React.useState<VariantWithStock[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [addedCellKey, setAddedCellKey] = React.useState<string | null>(null)
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    async function fetchVariants() {
      setIsLoading(true)
      setError(null)
      try {
        const { data: variantsData, error: variantsError } = await supabase
          .from("product_variants")
          .select("variant_id, size, color, price, sku")
          .eq("style_id", styleId)
          .order("size")
          .order("color")

        if (variantsError) throw new Error(variantsError.message)
        if (!variantsData?.length) {
          setVariants([])
          setIsLoading(false)
          return
        }

        const variantIds = variantsData.map((v: { variant_id: string }) => v.variant_id)
        const { data: inventoryData } = await supabase
          .from("inventory_levels")
          .select("variant_id, quantity_on_hand")
          .in("variant_id", variantIds)
          .eq("store_id", currentStoreId)

        const stockMap = new Map<string, number>()
        ;(inventoryData || []).forEach((row: { variant_id: string | null; quantity_on_hand: number | null }) => {
          if (row.variant_id) stockMap.set(row.variant_id, row.quantity_on_hand ?? 0)
        })

        const variantsWithStock: VariantWithStock[] = variantsData.map(
          (v: { variant_id: string; size: string; color: string; price: number | null; sku: string }) => {
            const rawPrice = v.price ?? 0
            const price = rawPrice > 0 ? rawPrice : basePrice
            return {
              variant_id: v.variant_id,
              size: v.size,
              color: v.color,
              price,
              sku: v.sku,
              stock: stockMap.get(v.variant_id) ?? 0,
            }
          }
        )
        setVariants(variantsWithStock)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load variants")
      } finally {
        setIsLoading(false)
      }
    }
    if (styleId && currentStoreId) fetchVariants()
  }, [styleId, currentStoreId, basePrice, supabase])

  const { matrix, sizes, colors } = React.useMemo(() => {
    if (!variants.length) return { matrix: [] as MatrixCell[][], sizes: [] as string[], colors: [] as string[] }
    const uniqueSizes = [...new Set(variants.map((v) => v.size))].sort()
    const uniqueColors = [...new Set(variants.map((v) => v.color))].sort()
    const variantMap = new Map<string, VariantWithStock>()
    variants.forEach((v) => variantMap.set(`${v.size}-${v.color}`, v))
    const matrix: MatrixCell[][] = uniqueSizes.map((size) =>
      uniqueColors.map((color) => ({
        variant: variantMap.get(`${size}-${color}`) ?? null,
        size,
        color,
      }))
    )
    return { matrix, sizes: uniqueSizes, colors: uniqueColors }
  }, [variants])

  const getStockStyles = (stock: number, isAvailable: boolean) => {
    if (stock === 0)
      return "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
    if (stock <= 5)
      return "border-warning-500 bg-warning-500/5 text-slate-700 dark:border-warning-600 dark:bg-warning-500/10 dark:text-slate-300"
    return "border-success-500 bg-success-500/5 text-slate-900 dark:border-success-600 dark:bg-success-500/10 dark:text-slate-100"
  }

  const handleCellClick = (cell: MatrixCell) => {
    if (!cell.variant || cell.variant.stock <= 0) return
    const key = `${cell.size}-${cell.color}`
    setAddedCellKey(key)
    onVariantSelect(
      cell.variant.variant_id,
      cell.variant.size,
      cell.variant.color,
      cell.variant.price
    )
    setTimeout(() => {
      setAddedCellKey(null)
      onClose()
    }, CLOSE_DELAY_MS)
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="h-full w-full max-h-[100vh] max-w-full overflow-y-auto border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-slate-200 sm:p-8 sm:shadow-2xl dark:sm:border-slate-800"
        aria-describedby={undefined}
      >
        {/* Header: image 120x120, name, price, close 40x40 */}
        <div className="sticky top-0 z-10 flex items-start gap-4 border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
            {imageUrl ? (
              <StorageImage
                src={imageUrl}
                alt={styleName}
                width={120}
                height={120}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <span className="text-2xl font-semibold text-slate-500">
                  {styleName.slice(0, 1)}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {styleName}
            </h2>
            <p className="mt-1 text-xl font-semibold text-primary-600 dark:text-primary-400">
              {formatCurrency(basePrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-danger-600 dark:text-danger-400">
              <p className="font-medium">Error loading variants</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          ) : variants.length === 0 ? (
            <p className="py-12 text-center text-slate-500 dark:text-slate-400">
              No variants configured for this product
            </p>
          ) : (
            <>
              {/* Variant Grid — 100x100 cells, size × color */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${colors.length + 1}, minmax(0, 1fr))` }}>
                {/* Top-left corner */}
                <div className="rounded-lg bg-slate-50 p-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Size / Color
                </div>
                {colors.map((color) => (
                  <div
                    key={color}
                    className="rounded-lg bg-slate-50 p-2 text-center text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {color}
                  </div>
                ))}
                {matrix.map((row, rowIndex) => (
                  <React.Fragment key={sizes[rowIndex]}>
                    <div className="flex items-center rounded-lg bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {sizes[rowIndex]}
                    </div>
                    {row.map((cell) => {
                      const v = cell.variant
                      const stock = v?.stock ?? 0
                      const available = stock > 0
                      const key = `${cell.size}-${cell.color}`
                      const justAdded = addedCellKey === key

                      return (
                        <div key={key} className="flex aspect-square min-h-0 w-full max-w-[100px] justify-center sm:max-w-none">
                          {v ? (
                            <button
                              type="button"
                              onClick={() => handleCellClick(cell)}
                              disabled={!available}
                              className={cn(
                                "relative flex h-full min-h-[80px] w-full flex-col items-center justify-center rounded-lg border-2 p-2 transition-all duration-200 sm:min-h-[100px]",
                                getStockStyles(stock, available),
                                available && "hover:border-primary-500 hover:scale-105 active:scale-95",
                                justAdded && "animate-pulse border-success-500 bg-success-500/20 ring-2 ring-success-500/50"
                              )}
                            >
                              <span className="text-xs font-semibold">{cell.size}</span>
                              <span className="my-1 text-lg font-bold tabular-nums">{stock}</span>
                              {v.price !== basePrice && (
                                <span className="text-xs font-medium">{formatCurrency(v.price)}</span>
                              )}
                              {justAdded && (
                                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-success-500/20">
                                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-500 text-white">
                                    <Check className="h-5 w-5" />
                                  </span>
                                </span>
                              )}
                            </button>
                          ) : (
                            <div className="flex h-full min-h-[80px] w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 sm:min-h-[100px]">
                              —
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-success-500 bg-success-500/10" />
                  In stock (5+)
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-warning-500 bg-warning-500/10" />
                  Low stock (1–5)
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
                  Out of stock
                </span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
