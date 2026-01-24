"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { createInventoryAdjustment } from "@/app/inventory/actions"

type AdjustmentType = "add" | "remove" | "set"

function createAdjustmentSchema(adjustmentType: AdjustmentType, currentStock: number) {
  return z.object({
    adjustmentType: z.enum(["add", "remove", "set"]),
    quantity: z.coerce
      .number({
        required_error: "Quantity is required.",
        invalid_type_error: "Quantity must be a number.",
      })
      .int("Quantity must be a whole number.")
      .min(adjustmentType === "set" ? 0 : 1, "Quantity must be at least 1.")
      .refine(
        (val) => {
          if (adjustmentType === "remove") {
            return val <= currentStock
          }
          return true
        },
        {
          message: "Cannot remove more than current stock.",
        }
      )
      .refine(
        (val) => {
          if (adjustmentType === "set") {
            return val >= 0
          }
          return true
        },
        {
          message: "Stock cannot be negative.",
        }
      ),
    reason: z.string().max(500, "Reason must be 500 characters or less.").optional(),
  })
}

type AdjustmentFormValues = z.infer<ReturnType<typeof createAdjustmentSchema>>

type InventoryAdjustmentModalProps = {
  variant: {
    variant_id: string
    style_name: string
    size: string
    color: string
    sku: string
  }
  store: {
    store_id: string
    name: string
  }
  currentStock: number
  onClose: () => void
  onSuccess: () => void
}

export function InventoryAdjustmentModal({
  variant,
  store,
  currentStock,
  onClose,
  onSuccess,
}: InventoryAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = React.useState<AdjustmentType>("add")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const schema = React.useMemo(
    () => createAdjustmentSchema(adjustmentType, currentStock),
    [adjustmentType, currentStock]
  )

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      adjustmentType: "add",
      quantity: 1,
      reason: "",
    },
    mode: "onChange",
  })

  // Reset quantity when adjustment type changes
  React.useEffect(() => {
    form.setValue("quantity", adjustmentType === "set" ? currentStock : 1)
    form.setValue("adjustmentType", adjustmentType)
    form.trigger("quantity")
  }, [adjustmentType, currentStock, form])

  const quantity = form.watch("quantity")
  const calculatedNewStock = React.useMemo(() => {
    const qty = Number(quantity) || 0
    if (adjustmentType === "add") {
      return currentStock + qty
    } else if (adjustmentType === "remove") {
      return currentStock - qty
    } else {
      return qty
    }
  }, [adjustmentType, currentStock, quantity])

  const onSubmit = async (values: AdjustmentFormValues) => {
    setIsSubmitting(true)
    try {
      let adjustment: number
      if (values.adjustmentType === "add") {
        adjustment = values.quantity
      } else if (values.adjustmentType === "remove") {
        adjustment = -values.quantity
      } else {
        // Set stock: adjustment is difference from current
        adjustment = values.quantity - currentStock
      }

      await createInventoryAdjustment({
        variant_id: variant.variant_id,
        store_id: store.store_id,
        adjustment,
        reason: values.reason || `Stock ${values.adjustmentType === "add" ? "added" : values.adjustmentType === "remove" ? "removed" : "set"}`,
      })

      toast.success("Stock updated successfully!")
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update stock.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            Adjust Stock: {variant.style_name} ({variant.size}/{variant.color})
          </DialogTitle>
          <DialogDescription>
            Current Stock at {store.name}: <span className="font-semibold">{currentStock}</span> units
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        setAdjustmentType(value as AdjustmentType)
                        field.onChange(value)
                      }}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <RadioGroupItem value="add" id="add" />
                        <Label htmlFor="add" className="flex-1 cursor-pointer">
                          <div className="font-medium">Add Stock</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Received shipment, restock, etc.
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <RadioGroupItem value="remove" id="remove" />
                        <Label htmlFor="remove" className="flex-1 cursor-pointer">
                          <div className="font-medium">Remove Stock</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Damaged, lost, returned, etc.
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <RadioGroupItem value="set" id="set" />
                        <Label htmlFor="set" className="flex-1 cursor-pointer">
                          <div className="font-medium">Set Stock</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Override to exact count (physical count)
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {adjustmentType === "add"
                      ? "Quantity to Add"
                      : adjustmentType === "remove"
                        ? "Quantity to Remove"
                        : "New Stock Quantity"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={adjustmentType === "set" ? 0 : 1}
                      max={adjustmentType === "remove" ? currentStock : undefined}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === "" ? "" : Number(value))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {adjustmentType === "remove" && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Maximum: {currentStock} units
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Received shipment, Damaged goods, Physical count correction..."
                      maxLength={500}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Preview
              </div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                New Stock:{" "}
                <span
                  className={`font-semibold ${
                    calculatedNewStock < 0
                      ? "text-red-600 dark:text-red-400"
                      : calculatedNewStock === 0
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {calculatedNewStock} units
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
