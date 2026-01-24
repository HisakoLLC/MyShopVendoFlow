"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast, Toaster } from "sonner"
import { Search, Package, ArrowRight } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createInventoryTransfer, type CreateTransferData } from "@/app/inventory/actions"
import { createClient } from "@/lib/supabase/client"

type Store = {
  store_id: string
  name: string
}

type ProductStyle = {
  style_id: string
  name: string
  image_url: string | null
}

type Variant = {
  variant_id: string
  size: string
  color: string
  sku: string
  style_id: string
  product_styles: {
    name: string
    image_url: string | null
  } | null
}

type TransferInventoryFormProps = {
  stores: Store[]
}

const transferSchema = z
  .object({
    from_store_id: z.string().min(1, "Source store is required."),
    to_store_id: z.string().min(1, "Destination store is required."),
    variant_id: z.string().min(1, "Variant is required."),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.from_store_id !== data.to_store_id, {
    message: "Cannot transfer to the same store.",
    path: ["to_store_id"],
  })

type TransferFormValues = z.infer<typeof transferSchema>

export function TransferInventoryForm({ stores }: TransferInventoryFormProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [productSearchQuery, setProductSearchQuery] = React.useState("")
  const [productResults, setProductResults] = React.useState<ProductStyle[]>([])
  const [selectedStyleId, setSelectedStyleId] = React.useState<string | null>(null)
  const [selectedStyleName, setSelectedStyleName] = React.useState("")
  const [variantOptions, setVariantOptions] = React.useState<Variant[]>([])
  const [selectedVariant, setSelectedVariant] = React.useState<Variant | null>(null)
  const [fromStock, setFromStock] = React.useState<number | null>(null)
  const [toStock, setToStock] = React.useState<number | null>(null)
  const [isLoadingStock, setIsLoadingStock] = React.useState(false)

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      from_store_id: "",
      to_store_id: "",
      variant_id: "",
      quantity: 1,
      notes: "",
    },
    mode: "onChange",
  })

  const watchedFromStore = form.watch("from_store_id")
  const watchedToStore = form.watch("to_store_id")
  const watchedVariantId = form.watch("variant_id")
  const watchedQuantity = form.watch("quantity")

  // Product search debounced
  React.useEffect(() => {
    if (!productSearchQuery.trim() || productSearchQuery.length < 2) {
      setProductResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const { data: styles, error } = await supabase
          .from("product_styles")
          .select("style_id, name, image_url")
          .ilike("name", `%${productSearchQuery.trim()}%`)
          .eq("archived", false)
          .limit(10)

        if (!error && styles) {
          setProductResults(styles)
        }
      } catch (err) {
        console.error("Error searching products:", err)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [productSearchQuery, supabase])

  // Fetch variants when style is selected
  const handleStyleSelect = async (styleId: string) => {
    setSelectedStyleId(styleId)
    const product = productResults.find((p) => p.style_id === styleId)
    if (product) {
      setSelectedStyleName(product.name)
    }
    setProductSearchQuery(product?.name || "")
    setProductResults([])
    form.setValue("variant_id", "")

    try {
      const { data: variants, error } = await supabase
        .from("product_variants")
        .select(
          `
          variant_id,
          size,
          color,
          sku,
          style_id,
          product_styles!inner(
            name,
            image_url
          )
        `
        )
        .eq("style_id", styleId)
        .order("size")
        .order("color")

      if (!error && variants) {
        setVariantOptions(variants as Variant[])
      }
    } catch (err) {
      console.error("Error fetching variants:", err)
    }
  }

  // Handle variant selection and fetch stock
  const handleVariantSelect = async (variantId: string) => {
    const variant = variantOptions.find((v) => v.variant_id === variantId)
    if (variant) {
      setSelectedVariant(variant)
      form.setValue("variant_id", variantId)
      await fetchStockLevels(variantId)
    }
  }

  // Fetch stock levels for both stores
  const fetchStockLevels = async (variantId: string) => {
    if (!watchedFromStore || !watchedToStore || !variantId) {
      setFromStock(null)
      setToStock(null)
      return
    }

    setIsLoadingStock(true)
    try {
      const { data: inventory, error } = await supabase
        .from("inventory_levels")
        .select("store_id, quantity_on_hand")
        .eq("variant_id", variantId)
        .in("store_id", [watchedFromStore, watchedToStore])

      if (!error && inventory) {
        const fromInventory = inventory.find((inv) => inv.store_id === watchedFromStore)
        const toInventory = inventory.find((inv) => inv.store_id === watchedToStore)
        setFromStock(fromInventory?.quantity_on_hand || 0)
        setToStock(toInventory?.quantity_on_hand || 0)
      } else {
        setFromStock(0)
        setToStock(0)
      }
    } catch (err) {
      console.error("Error fetching stock:", err)
      setFromStock(null)
      setToStock(null)
    } finally {
      setIsLoadingStock(false)
    }
  }

  // Refetch stock when stores or variant changes
  React.useEffect(() => {
    if (watchedVariantId && watchedFromStore && watchedToStore) {
      fetchStockLevels(watchedVariantId)
    } else {
      setFromStock(null)
      setToStock(null)
    }
  }, [watchedFromStore, watchedToStore, watchedVariantId])

  // Update max quantity when stock changes
  React.useEffect(() => {
    if (fromStock !== null && watchedQuantity > fromStock) {
      form.setValue("quantity", fromStock)
    }
  }, [fromStock, watchedQuantity, form])

  // Form submission
  const onSubmit = async (values: TransferFormValues) => {
    if (!selectedVariant) {
      toast.error("Please select a variant.")
      return
    }

    if (fromStock === null || values.quantity > fromStock) {
      toast.error(`Cannot transfer more than available stock (${fromStock || 0} units).`)
      return
    }

    setIsSubmitting(true)
    try {
      const data: CreateTransferData = {
        from_store_id: values.from_store_id,
        to_store_id: values.to_store_id,
        variant_id: values.variant_id,
        quantity: values.quantity,
        notes: values.notes || undefined,
      }

      const result = await createInventoryTransfer(data)
      const toStoreName = stores.find((s) => s.store_id === values.to_store_id)?.name || "destination"
      toast.success(`Transfer created. Mark as received when items arrive at ${toStoreName}.`)
      router.push("/inventory/transfers")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create transfer.")
      setIsSubmitting(false)
    }
  }

  const afterTransferFrom = fromStock !== null ? fromStock - (watchedQuantity || 0) : null
  const afterTransferTo = toStock !== null ? toStock + (watchedQuantity || 0) : null

  return (
    <>
      <Toaster richColors position="top-right" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Transfer Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="from_store_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Store *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source store" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stores.map((store) => (
                                <SelectItem key={store.store_id} value={store.store_id}>
                                  {store.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="to_store_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Store *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select destination store" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stores
                                .filter((store) => store.store_id !== watchedFromStore)
                                .map((store) => (
                                  <SelectItem key={store.store_id} value={store.store_id}>
                                    {store.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Product Search */}
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        placeholder="Search product by name or SKU..."
                        value={productSearchQuery}
                        onChange={(e) => {
                          setProductSearchQuery(e.target.value)
                          if (!e.target.value) {
                            setSelectedStyleId(null)
                            setSelectedStyleName("")
                            setVariantOptions([])
                            setSelectedVariant(null)
                            form.setValue("variant_id", "")
                          }
                        }}
                        className="pl-9"
                      />
                    </div>
                    {productResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                        {productResults.map((style) => (
                          <button
                            key={style.style_id}
                            type="button"
                            onClick={() => handleStyleSelect(style.style_id)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          >
                            {style.image_url && (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
                                <Image
                                  src={style.image_url}
                                  alt={style.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <span className="text-sm">{style.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedStyleName && (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Selected: {selectedStyleName}
                      </p>
                    )}
                  </FormItem>

                  {/* Variant Selection */}
                  {selectedStyleId && variantOptions.length > 0 && (
                    <FormField
                      control={form.control}
                      name="variant_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => handleVariantSelect(value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select variant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {variantOptions.map((variant) => (
                                <SelectItem key={variant.variant_id} value={variant.variant_id}>
                                  {variant.size} / {variant.color} ({variant.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity to Transfer *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max={fromStock || undefined}
                            {...field}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10) || 0
                              const max = fromStock || 0
                              const clampedValue = Math.min(Math.max(1, value), max)
                              field.onChange(clampedValue)
                            }}
                          />
                        </FormControl>
                        {fromStock !== null && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Max: {fromStock} units available
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Current Stock Display */}
                  {watchedVariantId && watchedFromStore && watchedToStore && (
                    <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">From Store Stock</div>
                        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {isLoadingStock ? "Loading..." : fromStock !== null ? `${fromStock} units` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">To Store Stock</div>
                        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {isLoadingStock ? "Loading..." : toStock !== null ? `${toStock} units` : "—"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., Customer requested at Riverside"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Preview Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Transfer Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {watchedVariantId && watchedFromStore && watchedToStore && fromStock !== null && (
                    <>
                      <div>
                        <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          After Transfer:
                        </div>
                        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                          <div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">From Store</div>
                            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                              {afterTransferFrom !== null ? `${afterTransferFrom} units` : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">To Store</div>
                            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                              {afterTransferTo !== null ? `${afterTransferTo} units` : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={isSubmitting || !watchedVariantId || !watchedFromStore || !watchedToStore}
                    >
                      <Package className="h-4 w-4" />
                      {isSubmitting ? "Creating..." : "Create Transfer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => router.push("/inventory")}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </>
  )
}
