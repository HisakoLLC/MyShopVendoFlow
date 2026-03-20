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
      <DialogContent className="sm:max-w-[550px] bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="font-editorial text-xl font-bold text-zinc-50">
            Adjust Stock: {variant.style_name} ({variant.size}/{variant.color})
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Current Stock at {store.name}: <span className="font-semibold text-zinc-100">{currentStock}</span> units
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Adjustment Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        setAdjustmentType(value as AdjustmentType)
                        field.onChange(value)
                      }}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-2 rounded-sm border border-zinc-800 p-3 bg-zinc-800/50">
                        <RadioGroupItem value="add" id="add" className="border-zinc-700 text-white" />
                        <Label htmlFor="add" className="flex-1 cursor-pointer">
                          <div className="font-medium text-zinc-100">Add Stock</div>
                          <div className="text-xs text-zinc-400">
                            Received shipment, restock, etc.
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 rounded-sm border border-zinc-800 p-3 bg-zinc-800/50">
                        <RadioGroupItem value="remove" id="remove" className="border-zinc-700 text-white" />
                        <Label htmlFor="remove" className="flex-1 cursor-pointer">
                          <div className="font-medium text-zinc-100">Remove Stock</div>
                          <div className="text-xs text-zinc-400">
                            Damaged, lost, returned, etc.
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 rounded-sm border border-zinc-800 p-3 bg-zinc-800/50">
                        <RadioGroupItem value="set" id="set" className="border-zinc-700 text-white" />
                        <Label htmlFor="set" className="flex-1 cursor-pointer">
                          <div className="font-medium text-zinc-100">Set Stock</div>
                          <div className="text-xs text-zinc-400">
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
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">
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
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm"
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
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Received shipment, Damaged goods, Physical count correction..."
                      maxLength={500}
                      rows={3}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 rounded-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            <div className="rounded-sm border border-zinc-800 bg-zinc-800/30 p-4">
              <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">
                Preview
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                New Stock:{" "}
                <span
                  className={`font-editorial text-xl font-bold tabular-nums ${
                    calculatedNewStock < 0
                      ? "text-red-400"
                      : calculatedNewStock === 0
                        ? "text-yellow-400"
                        : "text-green-400"
                  }`}
                >
                  {calculatedNewStock} units
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-200">
                {isSubmitting ? "Updating..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
