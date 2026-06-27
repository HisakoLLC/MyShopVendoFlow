"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

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
import { Button } from "@/components/ui/button"

const variantCellSchema = z
  .object({
    sku: z
      .string()
      .min(1, "SKU is required.")
      .regex(/^[A-Z0-9-]+$/, "SKU must contain only uppercase letters, numbers, and hyphens."),
    price: z.coerce.number().min(0.01, "Price must be greater than 0."),
    cost: z.coerce.number().min(0.01, "Cost must be greater than 0."),
  })
  .refine((data) => data.cost < data.price, {
    message: "Cost must be less than Price.",
    path: ["cost"],
  })

type VariantCellFormValues = z.infer<typeof variantCellSchema>

type VariantCellEditorProps = {
  open: boolean
  size: string
  color: string
  defaultSku: string
  defaultPrice: number
  defaultCost: number
  onSave: (data: { sku: string; price: number; cost: number }) => void
  onCancel: () => void
}

export function VariantCellEditor({
  open,
  size,
  color,
  defaultSku,
  defaultPrice,
  defaultCost,
  onSave,
  onCancel,
}: VariantCellEditorProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [open])
  const form = useForm<VariantCellFormValues>({
    resolver: zodResolver(variantCellSchema),
    defaultValues: {
      sku: defaultSku,
      price: defaultPrice,
      cost: defaultCost,
    },
    mode: "onChange",
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        sku: defaultSku,
        price: defaultPrice,
        cost: defaultCost,
      })
    }
  }, [open, defaultSku, defaultPrice, defaultCost, form])

  const onSubmit = (values: VariantCellFormValues) => {
    onSave({
      sku: values.sku.trim().toUpperCase(),
      price: values.price,
      cost: values.cost,
    })
    form.reset()
  }

  const handleCancel = () => {
    form.reset()
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border text-card-foreground rounded-lg shadow-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-8 border-b border-border bg-muted/50 shrink-0">
          <DialogTitle className="font-sans text-2xl font-bold text-foreground leading-tight">
            Edit Variant
          </DialogTitle>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">
            STYLING FOR: {size} / {color}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-8 py-8 space-y-6 min-h-0">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">SKU Identifier</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      ref={(e) => {
                        field.ref(e)
                        inputRef.current = e
                      }}
                      placeholder="e.g., OLS-M-NAV"
                      className="bg-background border-border text-foreground focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] rounded-md h-11 font-mono text-sm tracking-wider"
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-destructive mt-2" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Retail Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="bg-background border-border text-foreground focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] rounded-md h-11 font-mono text-sm"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value === "" ? "" : Number(value))
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-destructive mt-2" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Unit Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="bg-background border-border text-foreground focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] rounded-md h-11 font-mono text-sm"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value === "" ? "" : Number(value))
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-destructive mt-2" />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("price") > 0 && form.watch("cost") > 0 && (
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center bg-muted/30 p-4 border border-border rounded-md">
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">Est. Profit Margin</span>
                  <span className={`font-mono text-lg font-bold ${form.watch("price") > form.watch("cost") ? "text-emerald-500" : "text-destructive"}`}>
                    {form.watch("price") > form.watch("cost")
                      ? `${(((form.watch("price") - form.watch("cost")) / form.watch("price")) * 100).toFixed(1)}%`
                      : "INVALID"}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-8 gap-4 sm:gap-0 mt-4 -mx-8 px-8 py-6 bg-muted/20 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel} 
                className="rounded-md border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all text-[10px] font-bold uppercase tracking-widest h-12 px-8"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] transition-all text-[10px] font-bold uppercase tracking-widest h-12 px-8 flex-1 sm:flex-none"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
