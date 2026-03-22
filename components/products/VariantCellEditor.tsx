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
      <DialogContent className="sm:max-w-[450px] bg-zinc-950 border-zinc-800 text-zinc-100 rounded-none shadow-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-8 py-8 border-b border-zinc-900 bg-zinc-900/50">
          <DialogTitle className="font-editorial text-2xl font-bold text-zinc-50 leading-tight">
            Edit Variant
          </DialogTitle>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mt-2">
            STYLING FOR: {size} / {color}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-8 space-y-6">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">SKU Identifier</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., OLS-M-NAV"
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-zinc-700 focus:border-zinc-600 rounded-none h-11 font-mono text-sm tracking-wider"
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold tracking-widest text-red-400 mt-2" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Retail Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-zinc-700 focus:border-zinc-600 rounded-none h-11 font-mono text-sm"
                        {...field}
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

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Unit Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-zinc-700 focus:border-zinc-600 rounded-none h-11 font-mono text-sm"
                        {...field}
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
            </div>

            {form.watch("price") > 0 && form.watch("cost") > 0 && (
              <div className="pt-4 border-t border-zinc-900">
                <div className="flex justify-between items-center bg-zinc-900/30 p-4 border border-zinc-800">
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-zinc-500">Est. Profit Margin</span>
                  <span className={`font-mono text-lg font-bold ${form.watch("price") > form.watch("cost") ? "text-green-400" : "text-red-400"}`}>
                    {form.watch("price") > form.watch("cost")
                      ? `${(((form.watch("price") - form.watch("cost")) / form.watch("price")) * 100).toFixed(1)}%`
                      : "INVALID"}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-8 gap-4 sm:gap-0 mt-4 -mx-8 px-8 py-6 bg-zinc-900/20 border-t border-zinc-900">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel} 
                className="rounded-none border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest h-12 px-8"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="rounded-none bg-white text-zinc-950 hover:bg-zinc-100 transition-all text-[10px] font-bold uppercase tracking-widest h-12 px-8 flex-1 sm:flex-none"
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
