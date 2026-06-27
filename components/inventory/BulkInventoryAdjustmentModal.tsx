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
      <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground rounded-lg shadow-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-8 border-b border-border bg-muted/40 shrink-0">
          <DialogTitle className="font-sans text-2xl font-bold text-foreground leading-tight">
            Bulk Adjustment
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">
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
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Target Store</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border text-foreground h-11 rounded-md transition-all shadow-sm">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border text-foreground rounded-md">
                      {stores.map((s) => (
                        <SelectItem key={s.store_id} value={s.store_id} className="hover:bg-accent focus:bg-accent cursor-pointer">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-500 mt-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Adjustment mode</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-1 gap-3"
                    >
                      <div className={`flex items-start space-x-3 rounded-md border p-4 transition-all cursor-pointer ${field.value === 'add' ? 'bg-accent/50 border-[#E8400C]' : 'bg-transparent border-border hover:border-muted-foreground/40'}`}>
                        <RadioGroupItem value="add" id="bulk-add" className="mt-1 border-border text-[#E8400C]" />
                        <Label htmlFor="bulk-add" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-foreground mb-1">Add Incrementally</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-relaxed">Increase stock by quantity</div>
                        </Label>
                      </div>

                      <div className={`flex items-start space-x-3 rounded-md border p-4 transition-all cursor-pointer ${field.value === 'remove' ? 'bg-accent/50 border-[#E8400C]' : 'bg-transparent border-border hover:border-muted-foreground/40'}`}>
                        <RadioGroupItem value="remove" id="bulk-remove" className="mt-1 border-border text-[#E8400C]" />
                        <Label htmlFor="bulk-remove" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-foreground mb-1">Remove Incrementally</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-relaxed">Decrease stock by quantity</div>
                        </Label>
                      </div>

                      <div className={`flex items-start space-x-3 rounded-md border p-4 transition-all cursor-pointer ${field.value === 'set' ? 'bg-accent/50 border-[#E8400C]' : 'bg-transparent border-border hover:border-muted-foreground/40'}`}>
                        <RadioGroupItem value="set" id="bulk-set" className="mt-1 border-border text-[#E8400C]" />
                        <Label htmlFor="bulk-set" className="flex-1 cursor-pointer">
                          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-foreground mb-1">Absolute Override</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-relaxed">Set all items to exact quantity</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-500 mt-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                    {adjustmentType === "set" ? "Quantity" : "Change"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="bg-background border-border text-foreground h-12 rounded-md font-mono text-lg transition-all"
                      {...field}
                      ref={(e) => {
                        field.ref(e)
                        inputRef.current = e
                      }}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-500 mt-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Reason for audit</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Bulk physical count correction..."
                      rows={2}
                      className="bg-background border-border text-foreground rounded-md transition-all resize-none text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-500 mt-2" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-8 gap-4 sm:gap-0 mt-4 -mx-8 px-8 py-6 bg-muted/20 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isSubmitting} 
                className="rounded-md border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all text-[10px] font-bold uppercase tracking-widest h-12 px-8"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] transition-all text-[10px] font-bold uppercase tracking-widest h-12 px-8 flex-1 sm:flex-none shadow-sm"
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
