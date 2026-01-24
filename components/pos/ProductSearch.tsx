"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { VariantSelector } from "./VariantSelector"
import { useCart } from "@/lib/cart-context"

interface ProductSearchProps {
  defaultStoreId: string | null
}

interface ProductStyle {
  style_id: string
  name: string
  image_url: string | null
  base_price: number
}

export function ProductSearch({ defaultStoreId }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [products, setProducts] = React.useState<ProductStyle[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [selectedStyleId, setSelectedStyleId] = React.useState<string | null>(null)
  const [selectedStyleName, setSelectedStyleName] = React.useState<string>("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const supabase = React.useMemo(() => createClient(), [])
  const { addToCart } = useCart()

  // Auto-focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setProducts([])
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    const timeoutId = setTimeout(async () => {
      try {
        // First, search product_styles by name
        const { data: stylesByName, error: stylesError } = await supabase
          .from("product_styles")
          .select("style_id, name, image_url, base_price")
          .ilike("name", `%${searchQuery.trim()}%`)
          .eq("archived", false)
          .limit(12)

        if (stylesError) {
          console.error("Error searching styles:", stylesError)
          setProducts([])
          setIsLoading(false)
          return
        }

        // Then, search product_variants by SKU and get associated style_ids
        const { data: variantsBySku, error: variantsError } = await supabase
          .from("product_variants")
          .select("style_id")
          .ilike("sku", `%${searchQuery.trim()}%`)
          .limit(12)

        if (variantsError) {
          console.error("Error searching variants:", variantsError)
          // Continue with styles results even if variant search fails
        }

        // Get unique style_ids from variants
        const variantStyleIds = [
          ...new Set((variantsBySku || []).map((v) => v.style_id).filter(Boolean)),
        ] as string[]

        // Fetch product_styles for variant matches
        let stylesByVariant: ProductStyle[] = []
        if (variantStyleIds.length > 0) {
          const { data: variantStyles, error: variantStylesError } = await supabase
            .from("product_styles")
            .select("style_id, name, image_url, base_price")
            .in("style_id", variantStyleIds)
            .eq("archived", false)

          if (!variantStylesError && variantStyles) {
            stylesByVariant = variantStyles
          }
        }

        // Combine and deduplicate results
        const allStyles = [...(stylesByName || []), ...stylesByVariant]
        const uniqueStyles = Array.from(
          new Map(allStyles.map((style) => [style.style_id, style])).values()
        )

        // Limit to 12 results
        setProducts(uniqueStyles.slice(0, 12))
      } catch (error) {
        console.error("Error in search:", error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, supabase])

  const handleProductSelect = (styleId: string) => {
    const product = products.find((p) => p.style_id === styleId)
    if (product && defaultStoreId) {
      setSelectedStyleName(product.name)
      setSelectedStyleId(styleId)
    }
  }

  const handleVariantSelect = React.useCallback(
    async (variantId: string, size: string, color: string, price: number) => {
      if (!selectedStyleId || !defaultStoreId) return

      try {
        // Fetch variant details to get SKU, cost, and style info
        const { data: variant, error: variantError } = await supabase
          .from("product_variants")
          .select("sku, cost, product_styles!inner(style_id, name, image_url)")
          .eq("variant_id", variantId)
          .single()

        if (variantError || !variant) {
          console.error("Error fetching variant:", variantError)
          return
        }

        const style = variant.product_styles as unknown as {
          style_id: string
          name: string
          image_url: string | null
        }

        // Add to cart
        addToCart({
          variantId,
          styleName: style.name,
          size,
          color,
          sku: variant.sku,
          price,
        })

        // Close variant selector
        setSelectedStyleId(null)
        setSelectedStyleName("")
      } catch (error) {
        console.error("Error adding to cart:", error)
      }
    },
    [selectedStyleId, defaultStoreId, supabase, addToCart]
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 pl-10 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
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
                className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 text-left transition-all hover:scale-105 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-800"
              >
                {/* Product Image */}
                <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                  {product.image_url ? (
                    <Image
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
                  {formatPrice(product.base_price)}
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
          onVariantSelect={handleVariantSelect}
          onClose={() => {
            setSelectedStyleId(null)
            setSelectedStyleName("")
          }}
        />
      )}
    </div>
  )
}
