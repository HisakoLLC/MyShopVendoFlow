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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createBulkInventoryAdjustment } from "@/app/inventory/actions"

type AdjustmentType = "add" | "remove" | "set"

const bulkFormSchema = z
  .object({
    store_id: z.string().uuid("Select a store."),
    adjustmentType: z.enum(["add", "remove", "set"]),
    quantity: z.coerce
      .number()
      .int("Must be a whole number.")
      .min(0, "Quantity must be 0 or more."),
    reason: z.string().min(1, "Reason is required.").max(200, "Max 200 characters."),
  })
  .refine((data) => data.adjustmentType === "set" || data.quantity >= 1, {
    message: "Quantity must be at least 1 for add/remove.",
    path: ["quantity"],
  })

type BulkFormValues = z.infer<typeof bulkFormSchema>

type BulkInventoryAdjustmentModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  stores: Array<{ store_id: string; name: string }>
  selectedVariantIds: string[]
}

export function BulkInventoryAdjustmentModal({
  open,
  onClose,
  onSuccess,
  stores,
  selectedVariantIds,
}: BulkInventoryAdjustmentModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkFormSchema),
    defaultValues: {
      store_id: stores[0]?.store_id ?? "",
      adjustmentType: "add",
      quantity: 1,
      reason: "",
    },
    mode: "onChange",
  })

  React.useEffect(() => {
    if (open && stores.length > 0 && !form.getValues("store_id")) {
      form.setValue("store_id", stores[0].store_id)
    }
  }, [open, stores, form])

  const adjustmentType = form.watch("adjustmentType")

  const onSubmit = async (values: BulkFormValues) => {
    if (selectedVariantIds.length === 0) {
      toast.error("No variants selected.")
      return
    }
    setIsSubmitting(true)
    try {
      await createBulkInventoryAdjustment({
        variant_ids: selectedVariantIds,
        store_id: values.store_id,
        adjustmentType: values.adjustmentType as AdjustmentType,
        quantity: values.quantity,
        reason: values.reason,
      })
      toast.success(`Updated inventory for ${selectedVariantIds.length} variant(s).`)
      form.reset()
      onClose()
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk update failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const count = selectedVariantIds.length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="font-editorial text-xl font-bold text-zinc-50">Bulk adjust inventory</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Apply the same adjustment to {count} selected variant{count !== 1 ? "s" : ""} at one store.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="store_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Store</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {stores.map((s) => (
                        <SelectItem key={s.store_id} value={s.store_id} className="hover:bg-zinc-800 focus:bg-zinc-800">
                          {s.name}
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
              name="adjustmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Adjustment type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div className="flex items-center space-x-2 rounded-sm border border-zinc-800 p-2 bg-zinc-800/50">
                        <RadioGroupItem value="add" id="bulk-add" className="border-zinc-700 text-white" />
                        <Label htmlFor="bulk-add" className="cursor-pointer text-sm text-zinc-100">Add</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-sm border border-zinc-800 p-2 bg-zinc-800/50">
                        <RadioGroupItem value="remove" id="bulk-remove" className="border-zinc-700 text-white" />
                        <Label htmlFor="bulk-remove" className="cursor-pointer text-sm text-zinc-100">Remove</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-sm border border-zinc-800 p-2 bg-zinc-800/50">
                        <RadioGroupItem value="set" id="bulk-set" className="border-zinc-700 text-white" />
                        <Label htmlFor="bulk-set" className="cursor-pointer text-sm text-zinc-100">Set to</Label>
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
                      ? "Quantity to add"
                      : adjustmentType === "remove"
                        ? "Quantity to remove"
                        : "New quantity (set for all)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Bulk restock, Physical count..."
                      maxLength={200}
                      rows={2}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 rounded-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-200">
                {isSubmitting ? "Updating…" : `Apply to ${count} variant${count !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
