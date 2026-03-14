"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { toast, Toaster } from "sonner"
import { Plus, X, Search, Printer } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { SupplierQuickAddModal } from "@/components/purchasing/SupplierQuickAddModal"
import { createPurchaseOrder, signStorageUrls, type CreatePOData } from "@/app/purchasing/actions"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/format-currency"

type Supplier = {
  supplier_id: string
  name: string
}

type Variant = {
  variant_id: string
  size: string
  color: string
  sku: string
  cost: number | null
  style_id: string
  product_styles: {
    name: string
    image_url: string | null
  } | null
}

type PrefillItem = {
  variant_id: string
  quantity: number
}

type ProductStyle = {
  style_id: string
  name: string
  image_url: string | null
}

type LineItem = {
  style_id: string | null
  variant_id: string | null
  quantity: number
  unit_cost: number
}

const poSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required."),
  order_date: z.string().min(1, "Order date is required."),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  line_items: z
    .array(
      z.object({
        style_id: z.string().nullable(),
        variant_id: z.string().nullable(),
        quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
        unit_cost: z.coerce.number().min(0, "Unit cost must be 0 or greater."),
      })
    )
    .min(1, "At least one line item is required."),
})

type POFormValues = z.infer<typeof poSchema>

type CreatePOFormProps = {
  suppliers: Supplier[]
  prefillItems: PrefillItem[]
  prefillVariants: Variant[]
}

export function CreatePOForm({ suppliers, prefillItems, prefillVariants }: CreatePOFormProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showSupplierModal, setShowSupplierModal] = React.useState(false)
  const [supplierList, setSupplierList] = React.useState<Supplier[]>(suppliers)
  // Key search state by stable field.id (not index) so reordering rows doesn’t mix up state.
  const [productSearchQuery, setProductSearchQuery] = React.useState<Record<string, string>>({})
  const [productResults, setProductResults] = React.useState<Record<string, ProductStyle[]>>({})
  const [variantOptions, setVariantOptions] = React.useState<Record<string, Variant[]>>({})
  const [isSearching, setIsSearching] = React.useState<Record<string, boolean>>({})
  const [currency, setCurrency] = React.useState<string>("KES")

  React.useEffect(() => {
    let cancelled = false
    supabase.rpc("get_account_id").then(({ data: accountId }: { data: string | string[] | null }) => {
      if (cancelled) return
      const aid = Array.isArray(accountId) ? accountId[0] : accountId
      if (!aid) return
      supabase.from("business_settings").select("currency").eq("account_id", aid).single().then(({ data }: { data: { currency?: string } | null }) => {
        if (!cancelled && (data as { currency?: string } | null)?.currency) setCurrency((data as { currency: string }).currency)
      })
    })
    return () => { cancelled = true }
  }, [supabase])

  // Set default dates
  const today = new Date().toISOString().split("T")[0]
  const defaultDeliveryDate = new Date()
  defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 14)
  const defaultDeliveryDateStr = defaultDeliveryDate.toISOString().split("T")[0]

  // Initialize form with prefill data if available
  const defaultLineItems: LineItem[] =
    prefillItems.length > 0
      ? prefillItems.map((item) => {
          const variant = prefillVariants.find((v) => v.variant_id === item.variant_id)
          return {
            style_id: variant?.style_id || null,
            variant_id: variant?.variant_id || null,
            quantity: item.quantity,
            unit_cost: variant?.cost || 0,
          }
        })
      : [
          {
            style_id: null,
            variant_id: null,
            quantity: 1,
            unit_cost: 0,
          },
        ]

  const form = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplier_id: "",
      order_date: today,
      expected_delivery_date: defaultDeliveryDateStr,
      notes: "",
      line_items: defaultLineItems,
    },
    mode: "onChange",
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  })

  const watchedLineItems = form.watch("line_items")
  const watchedSupplierId = form.watch("supplier_id")

  // Calculate totals
  const totalCost = React.useMemo(() => {
    return watchedLineItems.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unit_cost || 0)
    }, 0)
  }, [watchedLineItems])

  // Product search debounced (lightweight: no image signing while typing)
  React.useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {}

    Object.entries(productSearchQuery).forEach(([key, query]) => {
      if (timeouts[key]) {
        clearTimeout(timeouts[key])
      }

      if (!query || query.trim().length < 2) {
        setProductResults((prev) => ({ ...prev, [key]: [] }))
        return
      }

      timeouts[key] = setTimeout(async () => {
        setIsSearching((prev) => ({ ...prev, [key]: true }))
        try {
          const { data: styles, error } = await supabase
            .from("product_styles")
            .select("style_id, name") // omit image_url to keep search snappy
            .ilike("name", `%${query.trim()}%`)
            .eq("archived", false)
            .limit(10)

          if (!error && styles) {
            setProductResults((prev) => ({ ...prev, [key]: styles as ProductStyle[] }))
          }
        } catch (err) {
          console.error("Error searching products:", err)
        } finally {
          setIsSearching((prev) => ({ ...prev, [key]: false }))
        }
      }, 300)
    })

    return () => {
      Object.values(timeouts).forEach(clearTimeout)
    }
  }, [productSearchQuery, supabase])

  // Fetch variants when style is selected
  const handleStyleSelect = async (fieldId: string, index: number, styleId: string) => {
    form.setValue(`line_items.${index}.style_id`, styleId)
    form.setValue(`line_items.${index}.variant_id`, null)
    form.setValue(`line_items.${index}.unit_cost`, 0)

    try {
      const { data: variants, error } = await supabase
        .from("product_variants")
        .select(
          `
          variant_id,
          size,
          color,
          sku,
          cost,
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
        // We don't need signed URLs for PO variants; keep it lightweight.
        setVariantOptions((prev) => ({ ...prev, [fieldId]: variants as Variant[] }))
      }
    } catch (err) {
      console.error("Error fetching variants:", err)
    }
  }

  // Handle variant selection
  const handleVariantSelect = (fieldId: string, index: number, variantId: string) => {
    const variants = variantOptions[fieldId] || []
    const variant = variants.find((v) => v.variant_id === variantId)
    if (variant) {
      form.setValue(`line_items.${index}.variant_id`, variantId)
      form.setValue(`line_items.${index}.unit_cost`, variant.cost || 0)
    }
  }

  // Handle supplier creation
  const handleSupplierCreated = (supplier: { supplier_id: string; name: string }) => {
    setSupplierList((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)))
    form.setValue("supplier_id", supplier.supplier_id)
    setShowSupplierModal(false)
  }

  // Form submission
  const onSubmit = async (values: POFormValues) => {
    setIsSubmitting(true)
    try {
      // Validate all line items have variants
      const invalidItems = values.line_items.filter((item) => !item.variant_id)
      if (invalidItems.length > 0) {
        toast.error("Please select a variant for all line items.")
        setIsSubmitting(false)
        return
      }

      const data: CreatePOData = {
        supplier_id: values.supplier_id,
        order_date: values.order_date,
        expected_delivery_date: values.expected_delivery_date || null,
        notes: values.notes || null,
        line_items: values.line_items.map((item) => ({
          variant_id: item.variant_id!,
          quantity_ordered: item.quantity,
          unit_cost: item.unit_cost,
        })),
        status: "draft",
      }

      const result = await createPurchaseOrder(data)
      toast.success(`PO ${result.po_number} created successfully!`)
      router.push(`/purchasing/${result.po_id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create purchase order.")
      setIsSubmitting(false)
    }
  }

  const handleSaveAsDraft = async () => {
    const values = form.getValues()
    setIsSubmitting(true)
    try {
      const invalidItems = values.line_items.filter((item) => !item.variant_id)
      if (invalidItems.length > 0) {
        toast.error("Please select a variant for all line items.")
        setIsSubmitting(false)
        return
      }

      const data: CreatePOData = {
        supplier_id: values.supplier_id,
        order_date: values.order_date,
        expected_delivery_date: values.expected_delivery_date || null,
        notes: values.notes || null,
        line_items: values.line_items.map((item) => ({
          variant_id: item.variant_id!,
          quantity_ordered: item.quantity,
          unit_cost: item.unit_cost,
        })),
        status: "draft",
      }

      const result = await createPurchaseOrder(data)
      toast.success(`PO ${result.po_number} saved as draft!`)
      router.push(`/purchasing/${result.po_id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save purchase order.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintPO = async () => {
    const values = form.getValues()
    setIsSubmitting(true)
    try {
      const invalidItems = values.line_items.filter((item) => !item.variant_id)
      if (invalidItems.length > 0) {
        toast.error("Please select a variant for all line items.")
        setIsSubmitting(false)
        return
      }

      const data: CreatePOData = {
        supplier_id: values.supplier_id,
        order_date: values.order_date,
        expected_delivery_date: values.expected_delivery_date || null,
        notes: values.notes || null,
        line_items: values.line_items.map((item) => ({
          variant_id: item.variant_id!,
          quantity_ordered: item.quantity,
          unit_cost: item.unit_cost,
        })),
        status: "draft",
      }

      const result = await createPurchaseOrder(data)
      toast.success(`PO ${result.po_number} created. Downloading PDF…`)

      const res = await fetch(`/api/po/${result.po_id}/pdf`)
      if (!res.ok) {
        toast.error("PO created but PDF download failed. You can print from the PO page.")
        router.push(`/purchasing/${result.po_id}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `PO-${result.po_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      router.push(`/purchasing/${result.po_id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create purchase order.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <Form {...form}>
        <form onSubmit={(e) => { e.preventDefault(); handlePrintPO(); }} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* PO Details */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  PO Details
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supplierList.map((supplier) => (
                                <SelectItem key={supplier.supplier_id} value={supplier.supplier_id}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            onClick={() => setShowSupplierModal(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="order_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expected_delivery_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Delivery Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes or instructions..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Line Items */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Line Items
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        style_id: null,
                        variant_id: null,
                        quantity: 1,
                        unit_cost: 0,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line Item
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Product</TableHead>
                        <TableHead className="w-[150px]">Variant</TableHead>
                        <TableHead className="w-[120px]">SKU</TableHead>
                        <TableHead className="w-[100px] text-right">Quantity</TableHead>
                        <TableHead className="w-[120px] text-right">Unit Cost</TableHead>
                        <TableHead className="w-[120px] text-right">Line Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const lineItem = watchedLineItems[index]
                        const fieldKey = field.id
                        const selectedVariant =
                          lineItem.variant_id && variantOptions[fieldKey]
                            ? variantOptions[fieldKey].find((v) => v.variant_id === lineItem.variant_id)
                            : null
                        const lineTotal = (lineItem.quantity || 0) * (lineItem.unit_cost || 0)

                        return (
                          <TableRow key={field.id}>
                            <TableCell className="align-top">
                              <Popover
                                open={!!(productResults[fieldKey]?.length)}
                                onOpenChange={(open) => {
                                  if (!open)
                                    setProductResults((prev) => ({ ...prev, [fieldKey]: [] }))
                                }}
                              >
                                <PopoverAnchor asChild>
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                      placeholder="Search product..."
                                      value={productSearchQuery[fieldKey] || ""}
                                      onChange={(e) => {
                                        setProductSearchQuery((prev) => ({
                                          ...prev,
                                          [fieldKey]: e.target.value,
                                        }))
                                      }}
                                      className="pl-8"
                                    />
                                  </div>
                                </PopoverAnchor>
                                <PopoverContent
                                  className="min-w-[var(--radix-popover-trigger-width)] max-w-[320px] p-0"
                                  side="bottom"
                                  align="start"
                                  sideOffset={4}
                                >
                                  <div className="max-h-60 overflow-auto">
                                    {productResults[fieldKey]?.map((style) => (
                                      <button
                                        key={style.style_id}
                                        type="button"
                                        onClick={() => {
                                          handleStyleSelect(fieldKey, index, style.style_id)
                                          setProductSearchQuery((prev) => ({
                                            ...prev,
                                            [fieldKey]: style.name,
                                          }))
                                          setProductResults((prev) => ({
                                            ...prev,
                                            [fieldKey]: [],
                                          }))
                                        }}
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
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              {lineItem.style_id ? (
                                <Select
                                  value={lineItem.variant_id || ""}
                                  onValueChange={(value) => handleVariantSelect(fieldKey, index, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select variant" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(variantOptions[index] || []).map((variant) => (
                                      <SelectItem
                                        key={variant.variant_id}
                                        value={variant.variant_id}
                                      >
                                        {variant.size} / {variant.color}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-zinc-400">Select product first</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {selectedVariant ? (
                                <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                                  {selectedVariant.sku}
                                </span>
                              ) : (
                                <span className="text-sm text-zinc-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`line_items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        className="w-20 text-right"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`line_items.${index}.unit_cost`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-24 text-right"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium">
                                {formatCurrency(lineTotal, currency, { maximumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* PO Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 rounded-lg border border-zinc-200 bg-zinc-900 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  PO Summary
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Line Items</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {fields.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Total Cost</span>
                    <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(totalCost, currency, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleSaveAsDraft}
                      disabled={isSubmitting || !watchedSupplierId}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      className="w-full gap-2"
                      onClick={handlePrintPO}
                      disabled={isSubmitting || !watchedSupplierId}
                    >
                      <Printer className="h-4 w-4" />
                      Print PO
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>

      <SupplierQuickAddModal
        open={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSuccess={handleSupplierCreated}
      />
    </>
  )
}
