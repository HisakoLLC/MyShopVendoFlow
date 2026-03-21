"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast, Toaster } from "sonner"
import { Package, X } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { receiveInventory, type ReceiveInventoryData } from "@/app/purchasing/actions"
import { createClient } from "@/lib/supabase/client"

type Store = {
  store_id: string
  name: string
}

type POLineItem = {
  line_item_id: string
  variant_id: string | null
  quantity_ordered: number
  quantity_received: number | null
  product_variants: {
    size: string
    color: string
    sku: string
    product_styles: {
      name: string
      image_url: string | null
    } | null
  } | null
}

type ReceiveInventoryFormProps = {
  poId: string
  lineItems: POLineItem[]
  stores: Store[]
}

const receiveSchema = z.object({
  store_id: z.string().min(1, "Destination store is required."),
  received_date: z.string().min(1, "Received date is required."),
  line_items: z.array(
    z.object({
      line_item_id: z.string(),
      quantity: z.coerce.number().min(0, "Quantity cannot be negative."),
    })
  ),
})

type ReceiveFormValues = z.infer<typeof receiveSchema>

export function ReceiveInventoryForm({
  poId,
  lineItems,
  stores,
}: ReceiveInventoryFormProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [barcodeInput, setBarcodeInput] = React.useState("")

  // Set default date to today
  const today = new Date().toISOString().split("T")[0]

  // Initialize form with default quantities (remaining to receive)
  const defaultLineItems = lineItems.map((item) => {
    const qtyReceived = item.quantity_received || 0
    const qtyRemaining = item.quantity_ordered - qtyReceived
    return {
      line_item_id: item.line_item_id,
      quantity: qtyRemaining > 0 ? qtyRemaining : 0,
    }
  })

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      store_id: "",
      received_date: today,
      line_items: defaultLineItems,
    },
    mode: "onChange",
  })

  const watchedLineItems = form.watch("line_items")
  const watchedStoreId = form.watch("store_id")

  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    if (!barcode || barcode.trim().length === 0) return

    // Find line item with matching SKU
    const matchingItem = lineItems.find(
      (item) => item.product_variants?.sku?.toLowerCase() === barcode.trim().toLowerCase()
    )

    if (!matchingItem) {
      toast.error(`No product found with SKU: ${barcode}`)
      setBarcodeInput("")
      return
    }

    const lineItemIndex = lineItems.findIndex(
      (item) => item.line_item_id === matchingItem.line_item_id
    )
    if (lineItemIndex === -1) return

    const currentQty = watchedLineItems[lineItemIndex]?.quantity || 0
    const qtyReceived = matchingItem.quantity_received || 0
    const qtyRemaining = matchingItem.quantity_ordered - qtyReceived

    if (qtyRemaining <= 0) {
      toast.error("This item is already fully received.")
      setBarcodeInput("")
      return
    }

    // Increment quantity by 1
    const newQty = Math.min(currentQty + 1, qtyRemaining)
    form.setValue(`line_items.${lineItemIndex}.quantity`, newQty)
    setBarcodeInput("")
    toast.success(`Added 1 to ${matchingItem.product_variants?.product_styles?.name || "item"}`)
  }

  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleBarcodeScan(barcodeInput)
    }
  }

  // Form submission
  const onSubmit = async (values: ReceiveFormValues) => {
    // Validate at least one item has quantity > 0
    const itemsWithQuantity = values.line_items.filter((item) => item.quantity > 0)
    if (itemsWithQuantity.length === 0) {
      toast.error("Please enter quantities for at least one line item.")
      return
    }

    // Validate quantities don't exceed remaining
    for (let i = 0; i < values.line_items.length; i++) {
      const formItem = values.line_items[i]
      const lineItem = lineItems[i]

      if (formItem.quantity > 0) {
        const qtyReceived = lineItem.quantity_received || 0
        const qtyRemaining = lineItem.quantity_ordered - qtyReceived

        if (formItem.quantity > qtyRemaining) {
          toast.error(
            `Cannot receive more than ordered. Item: ${lineItem.product_variants?.product_styles?.name || "Unknown"}, Remaining: ${qtyRemaining}`
          )
          return
        }
      }
    }

    setIsSubmitting(true)
    try {
      const data: ReceiveInventoryData = {
        po_id: poId,
        store_id: values.store_id,
        received_date: values.received_date,
        line_items: itemsWithQuantity,
      }

      await receiveInventory(data)
      toast.success("Inventory received successfully!")
      router.push(`/purchasing/${poId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to receive inventory.")
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Receiving Form */}
          <div className="rounded-lg border border-zinc-200 bg-background-card-light p-6 dark:border-border-dark dark:bg-background-card-dark">
            <h2 className="mb-4 font-editorial text-lg font-bold text-zinc-50">
              Receiving Details
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="store_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-1.5 block">Destination Store *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600">
                          <SelectValue placeholder="Where is this inventory going?" />
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
                name="received_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-1.5 block">Received Date *</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Barcode Scanning */}
            <div className="mt-4">
              <FormLabel className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-1.5 block">Scan Barcode (Optional)</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter SKU..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={handleBarcodeKeyPress}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => handleBarcodeScan(barcodeInput)}
                  className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-4 text-xs font-semibold uppercase transition-colors flex items-center justify-center shrink-0"
                >
                  Scan
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Scan a barcode to automatically increment the quantity for that item
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-lg border border-zinc-200 bg-background-card-light p-6 dark:border-border-dark dark:bg-background-card-dark">
            <h2 className="mb-4 font-editorial text-lg font-bold text-zinc-50">
              Line Items
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty Ordered</TableHead>
                    <TableHead className="text-right">Qty Previously Received</TableHead>
                    <TableHead className="text-right">Qty Remaining</TableHead>
                    <TableHead className="text-right">Receive Now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((lineItem, index) => {
                    const qtyReceived = lineItem.quantity_received || 0
                    const qtyRemaining = lineItem.quantity_ordered - qtyReceived
                    const receiveNow = watchedLineItems[index]?.quantity || 0
                    const isReceiving = receiveNow > 0
                    const isFullyReceived = qtyRemaining === 0

                    return (
                      <TableRow
                        key={lineItem.line_item_id}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={lineItem.product_variants?.product_styles?.image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-md" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800"}>
                              {lineItem.product_variants?.product_styles?.image_url ? (
                                <Image
                                  src={lineItem.product_variants.product_styles.image_url}
                                  alt={lineItem.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-zinc-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-zinc-100">
                                {lineItem.product_variants?.product_styles?.name || "—"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lineItem.product_variants ? (
                            <div className="text-sm text-zinc-300">
                              {lineItem.product_variants.size} / {lineItem.product_variants.color}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lineItem.product_variants?.sku ? (
                            <span className="font-mono text-sm text-zinc-400 tracking-wide">
                              {lineItem.product_variants.sku}
                            </span>
                          ) : (
                            <span className="text-sm text-zinc-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium text-zinc-100 tabular-nums">
                            {lineItem.quantity_ordered}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm text-zinc-400 tabular-nums">
                            {qtyReceived}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className={`font-semibold tabular-nums ${
                              qtyRemaining === 0
                                ? "text-green-400"
                                : qtyRemaining < 5
                                  ? "text-yellow-400"
                                  : "text-zinc-100"
                            }`}
                          >
                            {qtyRemaining}
                          </div>
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
                                      min="0"
                                      max={qtyRemaining}
                                      disabled={isFullyReceived}
                                      className="w-24 bg-zinc-900 border border-zinc-800 rounded-md h-8 px-2 text-sm text-zinc-100 text-center focus:ring-1 focus:ring-white/20 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      {...field}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value, 10) || 0
                                        const clampedValue = Math.min(
                                          Math.max(0, value),
                                          qtyRemaining
                                        )
                                        field.onChange(clampedValue)
                                      }}
                                    />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/purchasing/${poId}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !watchedStoreId} className="gap-2">
              <Package className="h-4 w-4" />
              {isSubmitting ? "Processing..." : "Confirm Receipt"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}
