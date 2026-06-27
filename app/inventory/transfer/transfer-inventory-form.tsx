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
              <Card className="bg-card border-border text-card-foreground rounded-lg shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/40">
                  <CardTitle className="font-sans text-xl font-bold text-foreground">Transfer Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="from_store_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">From Store *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-border text-foreground h-10 rounded-md focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]">
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border-border text-popover-foreground shadow-md">
                              {stores.map((store) => (
                                <SelectItem key={store.store_id} value={store.store_id} className="cursor-pointer">
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
                          <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">To Store *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-border text-foreground h-10 rounded-md focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]">
                                <SelectValue placeholder="Select destination" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border-border text-popover-foreground shadow-md">
                              {stores
                                .filter((store) => store.store_id !== watchedFromStore)
                                .map((store) => (
                                  <SelectItem key={store.store_id} value={store.store_id} className="cursor-pointer">
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
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Search Product *</FormLabel>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                        className="pl-9 bg-background border-border text-foreground h-10 rounded-md focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]"
                      />
                    </div>
                    {productResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                        {productResults.map((style) => (
                          <button
                            key={style.style_id}
                            type="button"
                            onClick={() => handleStyleSelect(style.style_id)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                          >
                            {style.image_url && (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-border">
                                <Image
                                  src={style.image_url}
                                  alt={style.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <span className="text-sm text-foreground">{style.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedStyleName && (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        Selected: <span className="text-foreground not-italic font-medium">{selectedStyleName}</span>
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
                          <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Variant *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => handleVariantSelect(value)}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-background border-border text-foreground h-10 rounded-md focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]">
                                <SelectValue placeholder="Select size/color" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border-border text-popover-foreground shadow-md">
                              {variantOptions.map((variant) => (
                                <SelectItem key={variant.variant_id} value={variant.variant_id} className="cursor-pointer">
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
                        <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Quantity to Transfer *</FormLabel>
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
                            className="bg-background border-border text-foreground h-10 rounded-md font-mono focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]"
                          />
                        </FormControl>
                        {fromStock !== null && (
                          <p className="text-xs text-muted-foreground">
                            Available: <span className="font-mono text-foreground">{fromStock}</span> units
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
                        <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Reason *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border text-foreground h-10 rounded-md focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border text-popover-foreground shadow-md">
                            <SelectItem value="rebalance" className="cursor-pointer">Rebalance inventory</SelectItem>
                            <SelectItem value="stockout" className="cursor-pointer">Stockout at destination</SelectItem>
                            <SelectItem value="customer" className="cursor-pointer">Customer request</SelectItem>
                            <SelectItem value="other" className="cursor-pointer">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Current Stock Display */}
                  {watchedVariantId && watchedFromStore && watchedToStore && (
                    <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-6 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Source Stock</div>
                        <div className="text-xl font-bold text-foreground font-mono">
                          {isLoadingStock ? "..." : fromStock !== null ? `${fromStock}` : "—"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Dest Stock</div>
                        <div className="text-xl font-bold text-foreground font-mono">
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
                        <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add internal notes for this transfer..."
                            className="bg-background border-border text-foreground rounded-md min-h-[100px] focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] transition-colors"
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
              <Card className="sticky top-6 bg-card border-border text-card-foreground rounded-lg shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/40">
                  <CardTitle className="font-sans text-xl font-bold text-foreground">Transfer Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {watchedVariantId && watchedFromStore && watchedToStore && fromStock !== null && (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-4 text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                          Transfer Summary
                        </div>
                        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Moving</span>
                            <span className="font-mono text-sm font-bold text-foreground">{watchedQuantity} units</span>
                          </div>
                          <div className="h-px bg-border w-full" />
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Source Store</span>
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono text-sm line-through text-muted-foreground">{fromStock}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className={`font-mono text-sm font-bold ${afterTransferFrom !== null && afterTransferFrom < 2 ? 'text-destructive' : 'text-foreground'}`}>
                                  {afterTransferFrom}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Dest Store</span>
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono text-sm line-through text-muted-foreground">{toStock}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-mono text-sm font-bold text-foreground">{afterTransferTo}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="pt-6 space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                      disabled={isSubmitting || !watchedVariantId || !watchedFromStore || !watchedToStore}
                    >
                      <Package className="h-4 w-4" />
                      {isSubmitting ? "Creating..." : "Confirm Transfer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 rounded-md border-border text-foreground hover:bg-accent"
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
        <DialogContent className="bg-card border border-border text-card-foreground rounded-lg shadow-lg p-0 overflow-hidden max-w-lg">
          <DialogHeader className="p-6 border-b border-border">
            <DialogTitle className="font-sans text-2xl font-bold text-foreground">Confirm Stock Movement</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Please review the transfer details before final confirmation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Produit & Variant</div>
              <div className="flex items-center gap-4">
                {selectedVariant?.product_styles?.image_url && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
                    <Image
                      src={selectedVariant.product_styles.image_url}
                      alt={selectedVariant.product_styles.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="font-sans text-lg font-bold text-foreground">
                    {selectedVariant?.product_styles?.name}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5 uppercase tracking-wider">
                    {selectedVariant?.size} / {selectedVariant?.color} — {selectedVariant?.sku}
                  </div>
                </div>
              </div>
            </div>

            {pendingValues && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="bg-muted rounded-full p-2 border border-border">
                      <ArrowRight className="h-4 w-4 text-foreground" />
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 border border-border rounded-lg p-4 text-center">
                    <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">From</div>
                    <div className="text-sm font-semibold text-foreground">
                      {stores.find((s) => s.store_id === pendingValues.from_store_id)?.name}
                    </div>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-4 text-center">
                    <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">To</div>
                    <div className="text-sm font-semibold text-foreground">
                      {stores.find((s) => s.store_id === pendingValues.to_store_id)?.name}
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
                  <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Transfer Quantity</div>
                  <div className="text-4xl font-bold text-foreground font-mono tracking-tighter">
                    {pendingValues.quantity}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-muted/40 border-t border-border gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => !isSubmitting && setConfirmOpen(false)}
              disabled={isSubmitting}
              className="rounded-md border-border text-foreground hover:bg-accent h-11 px-6 text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] h-11 px-8 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
              onClick={performTransfer}
              disabled={isSubmitting || !pendingValues}
            >
              {isSubmitting ? "Processing..." : "Complete Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
