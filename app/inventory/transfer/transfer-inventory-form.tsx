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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
    reason: z.enum(["rebalance", "stockout", "customer", "other"], {
      required_error: "Reason is required.",
    }),
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
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pendingValues, setPendingValues] = React.useState<TransferFormValues | null>(null)

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      from_store_id: "",
      to_store_id: "",
      variant_id: "",
      quantity: 1,
      reason: "rebalance",
      notes: "",
    },
    mode: "onChange",
  })

  const watchedFromStore = form.watch("from_store_id")
  const watchedToStore = form.watch("to_store_id")
  const watchedVariantId = form.watch("variant_id")
  const watchedQuantity = form.watch("quantity")

  // Product search debounced (server-side Supabase; API is available but this keeps latency low)
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
        const fromInventory = inventory.find((inv: { store_id: string | null; quantity_on_hand: number | null }) => inv.store_id === watchedFromStore)
        const toInventory = inventory.find((inv: { store_id: string | null; quantity_on_hand: number | null }) => inv.store_id === watchedToStore)
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

  const openConfirm = (values: TransferFormValues) => {
    if (!selectedVariant) {
      toast.error("Please select a variant.")
      return
    }

    if (fromStock === null || values.quantity > fromStock) {
      toast.error(`Cannot transfer more than available stock (${fromStock || 0} units).`)
      return
    }

    setPendingValues(values)
    setConfirmOpen(true)
  }

  const performTransfer = async () => {
    if (!pendingValues || !selectedVariant) return
    const values = pendingValues

    setIsSubmitting(true)
    try {
      const reasonLabel =
        values.reason === "rebalance"
          ? "Rebalance inventory"
          : values.reason === "stockout"
            ? "Stockout at destination"
            : values.reason === "customer"
              ? "Customer request"
              : "Other"
      const combinedNotes = [
        reasonLabel ? `[Reason: ${reasonLabel}]` : "",
        values.notes?.trim() || "",
      ]
        .filter(Boolean)
        .join(" ")

      const data: CreateTransferData = {
        from_store_id: values.from_store_id,
        to_store_id: values.to_store_id,
        variant_id: values.variant_id,
        quantity: values.quantity,
        notes: combinedNotes || undefined,
      }

      const result = await createInventoryTransfer(data)
      const toStoreName = stores.find((s) => s.store_id === values.to_store_id)?.name || "destination"
      toast.success(`Transfer created. Mark as received when items arrive at ${toStoreName}.`)
      router.push("/inventory/transfers")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create transfer.")
      setIsSubmitting(false)
    } finally {
      setConfirmOpen(false)
      setPendingValues(null)
    }
  }

  const afterTransferFrom = fromStock !== null ? fromStock - (watchedQuantity || 0) : null
  const afterTransferTo = toStock !== null ? toStock + (watchedQuantity || 0) : null

  return (
    <>
      <Toaster richColors position="top-right" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(openConfirm)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Transfer Details */}
              <Card className="bg-zinc-900 border-zinc-700/50 rounded-lg overflow-hidden">
                <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                  <CardTitle className="font-editorial text-xl font-bold text-zinc-50">Transfer Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="from_store_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">From Store *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm">
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                              {stores.map((store) => (
                                <SelectItem key={store.store_id} value={store.store_id} className="focus:bg-zinc-800 focus:text-white">
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
                          <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">To Store *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm">
                                <SelectValue placeholder="Select destination" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                              {stores
                                .filter((store) => store.store_id !== watchedFromStore)
                                .map((store) => (
                                  <SelectItem key={store.store_id} value={store.store_id} className="focus:bg-zinc-800 focus:text-white">
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
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Search Product *</FormLabel>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
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
                        className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm"
                      />
                    </div>
                    {productResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-800 bg-zinc-900 shadow-2xl">
                        {productResults.map((style) => (
                          <button
                            key={style.style_id}
                            type="button"
                            onClick={() => handleStyleSelect(style.style_id)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800"
                          >
                            {style.image_url && (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-zinc-800">
                                <Image
                                  src={style.image_url}
                                  alt={style.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <span className="text-sm text-zinc-100">{style.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedStyleName && (
                      <p className="mt-2 text-sm text-zinc-500 italic">
                        Selected: <span className="text-zinc-300 not-italic font-medium">{selectedStyleName}</span>
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
                          <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Variant *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => handleVariantSelect(value)}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm">
                                <SelectValue placeholder="Select size/color" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                              {variantOptions.map((variant) => (
                                <SelectItem key={variant.variant_id} value={variant.variant_id} className="focus:bg-zinc-800 focus:text-white">
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
                        <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Quantity to Transfer *</FormLabel>
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
                            className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm font-mono"
                          />
                        </FormControl>
                        {fromStock !== null && (
                          <p className="text-xs text-zinc-500">
                            Available: <span className="font-mono text-zinc-300">{fromStock}</span> units
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Reason */}
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Reason *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                            <SelectItem value="rebalance" className="focus:bg-zinc-800 focus:text-white">Rebalance inventory</SelectItem>
                            <SelectItem value="stockout" className="focus:bg-zinc-800 focus:text-white">Stockout at destination</SelectItem>
                            <SelectItem value="customer" className="focus:bg-zinc-800 focus:text-white">Customer request</SelectItem>
                            <SelectItem value="other" className="focus:bg-zinc-800 focus:text-white">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Current Stock Display */}
                  {watchedVariantId && watchedFromStore && watchedToStore && (
                    <div className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-800/20 p-6 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Source Stock</div>
                        <div className="text-xl font-bold text-zinc-100 font-mono">
                          {isLoadingStock ? "..." : fromStock !== null ? `${fromStock}` : "—"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Dest Stock</div>
                        <div className="text-xl font-bold text-zinc-100 font-mono">
                          {isLoadingStock ? "..." : toStock !== null ? `${toStock}` : "—"}
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
                        <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add internal notes for this transfer..."
                            className="bg-zinc-800 border-zinc-700 text-zinc-100 rounded-sm min-h-[100px] focus:border-zinc-500 transition-colors"
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
              <Card className="sticky top-6 bg-zinc-900 border-zinc-700/50 rounded-lg overflow-hidden">
                <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                  <CardTitle className="font-editorial text-xl font-bold text-zinc-50">Transfer Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {watchedVariantId && watchedFromStore && watchedToStore && fromStock !== null && (
                    <>
                      <div>
                        <div className="mb-4 text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">
                          After Transfer:
                        </div>
                        <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                          <div className="space-y-2">
                            <div className="text-xs text-zinc-500">Source Store</div>
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="text-lg font-bold font-mono text-zinc-50">
                                {afterTransferFrom !== null ? `${afterTransferFrom}` : "—"}
                              </div>
                              {afterTransferFrom !== null && (
                                <span
                                  className={
                                    afterTransferFrom < 0
                                      ? "text-[0.6rem] font-bold uppercase tracking-wider text-red-500"
                                      : afterTransferFrom <= 2
                                        ? "text-[0.6rem] font-bold uppercase tracking-wider text-zinc-500"
                                        : "text-[0.6rem] font-bold uppercase tracking-wider text-zinc-400"
                                  }
                                >
                                  {afterTransferFrom < 0
                                    ? "Insufficient"
                                    : afterTransferFrom <= 2
                                      ? "Low Stock"
                                      : "Healthy"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="pt-4 border-t border-zinc-800 space-y-2">
                            <div className="text-xs text-zinc-500">Destination Store</div>
                            <div className="text-lg font-bold font-mono text-zinc-50">
                              {afterTransferTo !== null ? `${afterTransferTo}` : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="pt-6 space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-sm bg-white text-zinc-950 hover:bg-zinc-100 gap-2 font-semibold"
                      disabled={isSubmitting || !watchedVariantId || !watchedFromStore || !watchedToStore}
                    >
                      <Package className="h-4 w-4" />
                      {isSubmitting ? "Creating..." : "Confirm Transfer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 rounded-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
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

      <Dialog open={confirmOpen} onOpenChange={(open) => !isSubmitting && setConfirmOpen(open)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-editorial text-xl font-bold text-zinc-50">Confirm Transfer</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Review stock movement details before final confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
              <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">Item to Transfer</div>
              <div className="font-editorial text-lg font-bold text-zinc-50">
                {selectedVariant?.product_styles?.name ?? "Selected product"}
              </div>
              <div className="text-sm font-mono text-zinc-400 mt-1">
                {selectedVariant ? `${selectedVariant.size} / ${selectedVariant.color}` : ""}
              </div>
            </div>
            {pendingValues && (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 text-center py-4 px-2 border-y border-zinc-800">
                  <div className="space-y-1">
                    <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">From Store</div>
                    <div className="text-sm text-zinc-300 font-medium">
                      {stores.find((s) => s.store_id === pendingValues.from_store_id)?.name ?? "Source"}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="bg-zinc-800 rounded-full p-2">
                      <ArrowRight className="h-4 w-4 text-zinc-400 rotate-90 md:rotate-0" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">To Store</div>
                    <div className="text-sm text-zinc-300 font-medium">
                      {stores.find((s) => s.store_id === pendingValues.to_store_id)?.name ?? "Destination"}
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-1">Transfer Qty</div>
                  <div className="text-3xl font-bold text-zinc-50 font-mono">{pendingValues.quantity}</div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                  <div className="space-y-1">
                    <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Source After</div>
                    <div className="text-sm font-mono text-zinc-300">
                      {afterTransferFrom !== null ? `${afterTransferFrom}` : "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Dest After</div>
                    <div className="text-sm font-mono text-zinc-300">
                      {afterTransferTo !== null ? `${afterTransferTo}` : "—"}
                    </div>
                  </div>
                    </div>
                  </div>
                )}
              </div>
          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => !isSubmitting && setConfirmOpen(false)}
              disabled={isSubmitting}
              className="rounded-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-100 gap-2 font-semibold"
              onClick={performTransfer}
              disabled={isSubmitting || !pendingValues}
            >
              <Package className="h-4 w-4" />
              {isSubmitting ? "Processing..." : "Complete Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
