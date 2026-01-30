"use client"

import * as React from "react"
import { Search, X, SearchX } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { StorageImage } from "@/components/StorageImage"
import { VariantSelector } from "./VariantSelector"
import { useCart } from "@/lib/cart-context"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format-currency"

interface ProductSearchProps {
  defaultStoreId: string | null
}

interface ProductStyle {
  style_id: string
  name: string
  image_url: string | null
  base_price: number
}

const DEBOUNCE_MS = 200

export function ProductSearch({ defaultStoreId }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [products, setProducts] = React.useState<ProductStyle[]>([])
  const [stockByStyle, setStockByStyle] = React.useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [selectedStyleId, setSelectedStyleId] = React.useState<string | null>(null)
  const [selectedStyleName, setSelectedStyleName] = React.useState("")
  const [selectedBasePrice, setSelectedBasePrice] = React.useState(0)
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const supabase = React.useMemo(() => createClient(), [])
  const { addToCart } = useCart()

  // Autofocus on mount
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search (200ms)
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setProducts([])
      setStockByStyle({})
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    const timeoutId = setTimeout(async () => {
      try {
        const { data: stylesByName, error: stylesError } = await supabase
          .from("product_styles")
          .select("style_id, name, image_url, base_price")
          .ilike("name", `%${searchQuery.trim()}%`)
          .eq("archived", false)
          .limit(12)

        if (stylesError) {
          setProducts([])
          setIsLoading(false)
          return
        }

        const { data: variantsBySku } = await supabase
          .from("product_variants")
          .select("style_id")
          .ilike("sku", `%${searchQuery.trim()}%`)
          .limit(12)

        const variantStyleIds = [
          ...new Set(
            (variantsBySku || [])
              .map((v: { style_id: string | null }) => v.style_id)
              .filter(Boolean)
          ),
        ] as string[]

        let stylesByVariant: ProductStyle[] = []
        if (variantStyleIds.length > 0) {
          const { data: variantStyles } = await supabase
            .from("product_styles")
            .select("style_id, name, image_url, base_price")
            .in("style_id", variantStyleIds)
            .eq("archived", false)
          if (variantStyles) stylesByVariant = variantStyles
        }

        const allStyles = [...(stylesByName || []), ...stylesByVariant]
        const uniqueStyles = Array.from(
          new Map(allStyles.map((s) => [s.style_id, s])).values()
        ).slice(0, 12)

        setProducts(uniqueStyles)

        // Fetch total stock per style at current store
        if (defaultStoreId && uniqueStyles.length > 0) {
          const styleIds = uniqueStyles.map((s) => s.style_id)
          const { data: variants } = await supabase
            .from("product_variants")
            .select("variant_id, style_id")
            .in("style_id", styleIds)
          if (variants && variants.length > 0) {
            const vids = variants.map((v: { variant_id: string }) => v.variant_id)
            const { data: inv } = await supabase
              .from("inventory_levels")
              .select("variant_id, quantity_on_hand")
              .eq("store_id", defaultStoreId)
              .in("variant_id", vids)
            const styleToVariant = new Map<string, string>(
              (variants as Array<{ variant_id: string; style_id: string }>).map((v) => [
                v.variant_id,
                v.style_id,
              ])
            )
            const sumByStyle: Record<string, number> = {}
            ;(inv || []).forEach((row: { variant_id: string; quantity_on_hand: number | null }) => {
              const styleId = styleToVariant.get(row.variant_id)
              if (styleId != null) {
                sumByStyle[styleId] = (sumByStyle[styleId] ?? 0) + (row.quantity_on_hand ?? 0)
              }
            })
            setStockByStyle(sumByStyle)
          } else {
            setStockByStyle({})
          }
        } else {
          setStockByStyle({})
        }
      } catch {
        setProducts([])
        setStockByStyle({})
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, defaultStoreId, supabase])

  const handleProductSelect = (styleId: string) => {
    const product = products.find((p) => p.style_id === styleId)
    if (product && defaultStoreId) {
      setSelectedStyleName(product.name)
      setSelectedStyleId(styleId)
      setSelectedBasePrice(product.base_price)
      setSelectedImageUrl(product.image_url)
    }
  }

  const handleVariantSelect = React.useCallback(
    async (variantId: string, size: string, color: string, price: number) => {
      if (!selectedStyleId || !defaultStoreId) return
      try {
        const { data: variant, error } = await supabase
          .from("product_variants")
          .select("sku, product_styles!inner(style_id, name, image_url)")
          .eq("variant_id", variantId)
          .single()

        if (error || !variant) return
        const style = variant.product_styles as unknown as {
          style_id: string
          name: string
          image_url: string | null
        }

        addToCart({
          variantId,
          styleName: style.name,
          size,
          color,
          sku: variant.sku,
          price,
          imageUrl: style.image_url ?? null,
        })
        setSelectedStyleId(null)
        setSelectedStyleName("")
      } catch {
        // ignore
      }
    },
    [selectedStyleId, defaultStoreId, supabase, addToCart]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Search Bar — sticky, 64px, large tap target */}
      <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative w-full">
          <Search
            className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pl-12 pr-12 text-lg text-slate-900 placeholder-slate-500",
              "focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20",
              "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-primary-500 dark:focus:bg-slate-900"
            )}
            aria-label="Search products"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Product Grid — scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="mb-4 h-14 w-14 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-600 dark:text-slate-400">
              Start typing to search products or scan a barcode
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <SearchX className="mb-4 h-14 w-14 text-slate-400 dark:text-slate-500" />
            <p className="text-base font-medium text-slate-900 dark:text-slate-100">
              No products found for &quot;{searchQuery}&quot;
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {products.map((product) => {
              const totalStock = stockByStyle[product.style_id] ?? 0
              const stockLabel =
                totalStock > 0
                  ? `${totalStock} in stock`
                  : "Out of stock"
              const stockGreen = totalStock > 5

              return (
                <button
                  key={product.style_id}
                  type="button"
                  onClick={() => handleProductSelect(product.style_id)}
                  className={cn(
                    "group relative flex min-h-[180px] flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-all duration-200",
                    "hover:border-primary-500 hover:scale-[1.02] hover:shadow-lg",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                    "dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary-500"
                  )}
                >
                  {/* Image — aspect-square, full width */}
                  <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    {product.image_url ? (
                      <StorageImage
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="(max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <SearchX className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="mb-2 line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {product.name}
                  </h3>

                  {/* Price + Stock badge */}
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(product.base_price)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        totalStock === 0
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : stockGreen
                            ? "bg-success-500/10 text-success-700 dark:text-success-400"
                            : "bg-warning-500/10 text-warning-700 dark:text-warning-600"
                      )}
                    >
                      {stockLabel}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedStyleId && defaultStoreId && (
        <VariantSelector
          styleId={selectedStyleId}
          styleName={selectedStyleName}
          currentStoreId={defaultStoreId}
          basePrice={selectedBasePrice}
          imageUrl={selectedImageUrl}
          onVariantSelect={handleVariantSelect}
          onClose={() => {
            setSelectedStyleId(null)
            setSelectedStyleName("")
            setSelectedBasePrice(0)
            setSelectedImageUrl(null)
          }}
        />
      )}
    </div>
  )
}
