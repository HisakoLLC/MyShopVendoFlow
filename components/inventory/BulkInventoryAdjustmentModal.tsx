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
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [open])

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
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100 rounded-none shadow-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-8 border-b border-zinc-900 bg-zinc-900/50 shrink-0">
          <DialogTitle className="font-editorial text-2xl font-bold text-zinc-50 leading-tight">
            Bulk Adjustment
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mt-2">
            APPLYING TO {count} SELECTED VARIANT{count !== 1 ? "S" : ""}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-8 py-8 space-y-8 min-h-0">
            <FormField
              control={form.control}
              name="store_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Target Store</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 h-11 rounded-none focus:ring-1 focus:ring-zinc-700 transition-all">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 rounded-none">
                      {stores.map((s) => (
                        <SelectItem key={s.store_id} value={s.store_id} className="hover:bg-zinc-900 focus:bg-zinc-900 cursor-pointer">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-400 mt-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Adjustment mode</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-1 gap-3"
                    >
                      <div className={`flex items-start space-x-3 rounded-none border p-4 transition-all cursor-pointer ${field.value === 'add' ? 'bg-zinc-900 border-zinc-600' : 'bg-transparent border-zinc-900 hover:border-zinc-800'}`}>
                        <RadioGroupItem value="add" id="bulk-add" className="mt-1 border-zinc-700 text-white" />
                        <Label htmlFor="bulk-add" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-zinc-100 mb-1">Add Incrementally</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider leading-relaxed">Increase stock by quantity</div>
                        </Label>
                      </div>

                      <div className={`flex items-start space-x-3 rounded-none border p-4 transition-all cursor-pointer ${field.value === 'remove' ? 'bg-zinc-900 border-zinc-600' : 'bg-transparent border-zinc-900 hover:border-zinc-800'}`}>
                        <RadioGroupItem value="remove" id="bulk-remove" className="mt-1 border-zinc-700 text-white" />
                        <Label htmlFor="bulk-remove" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-zinc-100 mb-1">Remove Incrementally</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider leading-relaxed">Decrease stock by quantity</div>
                        </Label>
                      </div>

                      <div className={`flex items-start space-x-3 rounded-none border p-4 transition-all cursor-pointer ${field.value === 'set' ? 'bg-zinc-900 border-zinc-600' : 'bg-transparent border-zinc-900 hover:border-zinc-800'}`}>
                        <RadioGroupItem value="set" id="bulk-set" className="mt-1 border-zinc-700 text-white" />
                        <Label htmlFor="bulk-set" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-zinc-100 mb-1">Absolute Override</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider leading-relaxed">Set all items to exact quantity</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-400 mt-2" />
                </FormItem>
              )}
            />

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
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-400 mt-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Reason for audit</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Bulk physical count correction..."
                      rows={2}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 rounded-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-600 transition-all resize-none text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-400 mt-2" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-8 gap-4 sm:gap-0 mt-4 -mx-8 px-8 py-6 bg-zinc-900/20 border-t border-zinc-900">
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
                {isSubmitting ? "Processing…" : `Update ${count} items`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
