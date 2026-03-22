"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

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
      <DialogContent className="sm:max-w-[550px] bg-zinc-950 border-zinc-800 text-zinc-100 rounded-none shadow-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-8 border-b border-zinc-900 bg-zinc-900/50 shrink-0">
          <DialogTitle className="font-editorial text-2xl font-bold text-zinc-50 leading-tight">
            Adjust Stock
          </DialogTitle>
          <div className="mt-2 space-y-1">
            <p className="font-editorial text-sm font-semibold text-zinc-200">
              {variant.style_name}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              {variant.size} / {variant.color} — {variant.sku}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Current Stock @ {store.name}</p>
            <p className="font-mono text-2xl font-bold text-zinc-100">{currentStock}</p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-8 py-8 space-y-8 min-h-0">
            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Adjustment Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        setAdjustmentType(value as AdjustmentType)
                        field.onChange(value)
                      }}
                      className="grid grid-cols-1 gap-3"
                    >
                      <div className={`flex items-start space-x-3 rounded-none border p-4 transition-all cursor-pointer ${field.value === 'add' ? 'bg-zinc-900 border-zinc-600' : 'bg-transparent border-zinc-800 hover:border-zinc-700'}`}>
                        <RadioGroupItem value="add" id="add" className="mt-1 border-zinc-700 text-white" />
                        <Label htmlFor="add" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-zinc-100 mb-1">Add Stock</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider leading-relaxed">
                            Received shipment or restock
                          </div>
                        </Label>
                      </div>

                      <div className={`flex items-start space-x-3 rounded-none border p-4 transition-all cursor-pointer ${field.value === 'remove' ? 'bg-zinc-900 border-zinc-600' : 'bg-transparent border-zinc-800 hover:border-zinc-700'}`}>
                        <RadioGroupItem value="remove" id="remove" className="mt-1 border-zinc-700 text-white" />
                        <Label htmlFor="remove" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-zinc-100 mb-1">Remove Stock</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider leading-relaxed">
                            Damaged, lost, or returned
                          </div>
                        </Label>
                      </div>

                      <div className={`flex items-start space-x-3 rounded-none border p-4 transition-all cursor-pointer ${field.value === 'set' ? 'bg-zinc-900 border-zinc-600' : 'bg-transparent border-zinc-800 hover:border-zinc-700'}`}>
                        <RadioGroupItem value="set" id="set" className="mt-1 border-zinc-700 text-white" />
                        <Label htmlFor="set" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-zinc-100 mb-1">Set Stock</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider leading-relaxed">
                            Physical count override
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">
                      {adjustmentType === "set" ? "Quantity" : "Change"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 h-12 rounded-none font-mono text-lg focus:ring-1 focus:ring-zinc-700 focus:border-zinc-600 transition-all"
                        {...field}
                        ref={(e) => {
                          field.ref(e)
                          inputRef.current = e
                        }}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value === "" ? "" : Number(value))
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-400 mt-2" />
                  </FormItem>
                )}
              />

              <div className="rounded-none border border-zinc-800 bg-zinc-900/30 p-4 h-full flex flex-col justify-center">
                <div className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-1">
                  Preview
                </div>
                <div className="font-mono text-2xl font-bold text-zinc-100">
                  {calculatedNewStock}
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 ml-2">units</span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Physical count correction..."
                      rows={2}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 rounded-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-600 transition-all resize-none text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 gap-4 sm:gap-0 border-t border-zinc-900 mt-4 -mx-8 px-8 py-6 bg-zinc-900/20">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isSubmitting} 
                className="rounded-none border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest h-12 px-8"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="rounded-none bg-white text-zinc-950 hover:bg-zinc-100 transition-all text-[10px] font-bold uppercase tracking-widest h-12 px-8 flex-1 sm:flex-none"
              >
                {isSubmitting ? "Processing..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
