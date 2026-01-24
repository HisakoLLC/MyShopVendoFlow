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
import { Button } from "@/components/ui/button"
import { createInventoryAdjustment } from "@/app/inventory/actions"

const adjustmentSchema = z.object({
  adjustment: z.coerce
    .number({
      required_error: "Adjustment amount is required.",
      invalid_type_error: "Adjustment must be a number.",
    })
    .int("Adjustment must be a whole number.")
    .refine((val) => val !== 0, "Adjustment cannot be zero."),
  reason: z.string().min(1, "Reason is required.").max(200, "Reason must be 200 characters or less."),
})

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>

type InventoryAdjustmentModalProps = {
  variantId: string
  storeId: string
  currentQuantity: number
  onClose: () => void
  onSuccess: () => void
}

export function InventoryAdjustmentModal({
  variantId,
  storeId,
  currentQuantity,
  onClose,
  onSuccess,
}: InventoryAdjustmentModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustment: 0,
      reason: "",
    },
    mode: "onChange",
  })

  const adjustment = form.watch("adjustment")
  const newQuantity = React.useMemo(() => {
    const adj = Number(adjustment) || 0
    return currentQuantity + adj
  }, [currentQuantity, adjustment])

  const onSubmit = async (values: AdjustmentFormValues) => {
    setIsSubmitting(true)
    try {
      await createInventoryAdjustment({
        variant_id: variantId,
        store_id: storeId,
        adjustment: values.adjustment,
        reason: values.reason,
      })

      toast.success("Stock adjusted successfully!")
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to adjust stock.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Current stock: <span className="font-semibold">{currentQuantity}</span> units
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="adjustment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., +10 or -5"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === "" ? "" : Number(value))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Use positive numbers to add stock, negative to remove.
                  </p>
                  {adjustment !== 0 && (
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      New quantity: <span className={newQuantity < 0 ? "text-red-600 dark:text-red-400" : ""}>{newQuantity}</span>
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
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Stock count correction, Damaged goods, etc."
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adjusting..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
