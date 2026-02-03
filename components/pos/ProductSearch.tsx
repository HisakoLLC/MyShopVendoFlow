"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { StorageImage } from "@/components/StorageImage"
import { VariantSelector } from "./VariantSelector"
import { useCart } from "@/lib/cart-context"
import { toast } from "sonner"

interface ProductSearchProps {
  defaultStoreId: string | null
}

function isDiscountActive(percent: number | null | undefined, endsAt: string | null | undefined): boolean {
  const pct = Number(percent) || 0
  if (pct <= 0) return false
  if (!endsAt) return true
  try {
    return new Date(endsAt) > new Date()
  } catch {
    return true
  }
}

interface ProductStyle {
  style_id: string
  name: string
  image_url: string | null
  base_price: number
  discount_percent?: number | null
  discount_ends_at?: string | null
}

export function ProductSearch({ defaultStoreId }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [products, setProducts] = React.useState<ProductStyle[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [selectedStyleId, setSelectedStyleId] = React.useState<string | null>(null)
  const [selectedStyleName, setSelectedStyleName] = React.useState<string>("")
  const [selectedBasePrice, setSelectedBasePrice] = React.useState<number>(0)
  const [selectedDiscountPercent, setSelectedDiscountPercent] = React.useState<number>(0)
  const [selectedDiscountEndsAt, setSelectedDiscountEndsAt] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const supabase = React.useMemo(() => createClient(), [])
  const { addToCart, taxInclusive, taxRatePercent } = useCart()

  // Auto-focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search: exact SKU → add to cart; otherwise show product grid
  React.useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setProducts([])
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    const timeoutId = setTimeout(async () => {
      try {
        // Exact SKU match (case-insensitive): if exactly one variant, add to cart and skip grid
        const { data: exactVariants, error: exactError } = await supabase
          .from("product_variants")
          .select("variant_id, style_id, size, color, price, sku, product_styles(name, base_price, discount_percent, discount_ends_at)")
          .ilike("sku", query)
          .limit(2)

        if (!exactError && exactVariants?.length === 1) {
          const v = exactVariants[0] as {
            variant_id: string
            style_id: string
            size: string
            color: string
            price: number | null
            sku: string
            product_styles: { name: string | null; base_price: number | null; discount_percent?: number | null; discount_ends_at?: string | null } | null
          }
          const styleName = v.product_styles?.name ?? "Product"
          const basePrice = v.product_styles?.base_price ?? 0
          const rawPrice = (v.price != null && v.price > 0) ? v.price : basePrice
          const discountPct = Number(v.product_styles?.discount_percent) || 0
          const active = isDiscountActive(discountPct, v.product_styles?.discount_ends_at)
          const price = active ? Math.round(rawPrice * (1 - discountPct / 100)) : rawPrice
          addToCart({
            variantId: v.variant_id,
            styleName,
            size: v.size,
            color: v.color,
            sku: v.sku,
            price,
          })
          setSearchQuery("")
          setProducts([])
          setHasSearched(false)
          toast.success(`Added ${styleName} (${v.size} / ${v.color}) to cart`)
          setIsLoading(false)
          return
        }

        // Otherwise: search by name and partial SKU, show product grid
        const { data: stylesByName, error: stylesError } = await supabase
          .from("product_styles")
          .select("style_id, name, image_url, base_price, discount_percent, discount_ends_at")
          .ilike("name", `%${query}%`)
          .eq("archived", false)
          .limit(12)

        if (stylesError) {
          console.error("Error searching styles:", stylesError)
          setProducts([])
          setIsLoading(false)
          return
        }

        const { data: variantsBySku, error: variantsError } = await supabase
          .from("product_variants")
          .select("style_id")
          .ilike("sku", `%${query}%`)
          .limit(12)

        if (variantsError) {
          console.error("Error searching variants:", variantsError)
        }

        const variantStyleIds = [
          ...new Set((variantsBySku || []).map((v: { style_id: string | null }) => v.style_id).filter(Boolean)),
        ] as string[]

        let stylesByVariant: ProductStyle[] = []
        if (variantStyleIds.length > 0) {
          const { data: variantStyles, error: variantStylesError } = await supabase
            .from("product_styles")
            .select("style_id, name, image_url, base_price, discount_percent, discount_ends_at")
            .in("style_id", variantStyleIds)
            .eq("archived", false)

          if (!variantStylesError && variantStyles) {
            stylesByVariant = variantStyles
          }
        }

        const allStyles = [...(stylesByName || []), ...stylesByVariant]
        const uniqueStyles = Array.from(
          new Map(allStyles.map((style) => [style.style_id, style])).values()
        )
        setProducts(uniqueStyles.slice(0, 12))
      } catch (error) {
        console.error("Error in search:", error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, supabase, addToCart])

  const handleProductSelect = (styleId: string) => {
    const product = products.find((p) => p.style_id === styleId)
    if (product && defaultStoreId) {
      setSelectedStyleName(product.name)
      setSelectedStyleId(styleId)
      setSelectedBasePrice(product.base_price)
      setSelectedDiscountPercent(Number(product.discount_percent) || 0)
      setSelectedDiscountEndsAt(product.discount_ends_at ?? null)
    }
  }

  const handleVariantSelect = React.useCallback(
    (variantId: string, size: string, color: string, price: number, sku: string, styleName: string) => {
      const name = styleName || selectedStyleName
      if (!name) return

      addToCart({
        variantId,
        styleName: name,
        size,
        color,
        sku,
        price,
      })
      // Modal stays open so user can add more; close via Done
    },
    [selectedStyleName, addToCart]
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search Bar */}
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-background px-4 py-3 pl-10 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-background dark:text-zinc-100 dark:placeholder-zinc-400"
          />
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Product Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500 dark:text-zinc-400">Searching...</div>
          </div>
        ) : !hasSearched ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-500 dark:text-zinc-400">Start typing to search products</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-500 dark:text-zinc-400">
              No products found for &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.style_id}
                onClick={() => handleProductSelect(product.style_id)}
                className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-background p-4 text-left transition-all hover:scale-105 hover:shadow-lg dark:border-zinc-800 dark:bg-background"
              >
                {/* Product Image */}
                <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                  {product.image_url ? (
                    <StorageImage
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-110"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-400">
                      <svg
                        className="h-12 w-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <h3 className="mb-1 line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {product.name}
                </h3>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {isDiscountActive(product.discount_percent, product.discount_ends_at)
                    ? formatPrice(Math.round(product.base_price * (1 - (Number(product.discount_percent) || 0) / 100)))
                    : formatPrice(product.base_price)}
                  {isDiscountActive(product.discount_percent, product.discount_ends_at) && (
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                      {product.discount_percent}% off
                    </span>
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Variant Selector Modal */}
      {selectedStyleId && defaultStoreId && (
        <VariantSelector
          styleId={selectedStyleId}
          styleName={selectedStyleName}
          currentStoreId={defaultStoreId}
          basePrice={selectedBasePrice}
          discountPercent={selectedDiscountPercent}
          discountEndsAt={selectedDiscountEndsAt}
          onVariantSelect={handleVariantSelect}
          onClose={() => {
            setSelectedStyleId(null)
            setSelectedStyleName("")
            setSelectedBasePrice(0)
          }}
        />
      )}
    </div>
  )
}
