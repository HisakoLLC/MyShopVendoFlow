"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

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

  // Reset form when dialog opens/closes or defaults change
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
      <DialogContent className="sm:max-w-[425px] !bg-zinc-900 !border-zinc-800 !text-zinc-100 !rounded-sm !shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-editorial text-xl font-bold text-zinc-50">
            Edit Variant: {size} - {color}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            Update the SKU, price, and cost for this size and color combination.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">SKU</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., OLS-M-NAV"
                      className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 focus:ring-1 focus:ring-white/10 rounded-sm"
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[0.65rem] text-zinc-500 tracking-wide">
                    UPPERCASE LETTERS, NUMBERS, AND HYPHENS ONLY
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Price (KES)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      step="0.01"
                      {...field}
                      className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 focus:ring-1 focus:ring-white/10 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === "" ? "" : Number(value))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[0.65rem] text-zinc-500 tracking-wide">
                    PREVIEW: KES{" "}
                    {field.value
                      ? new Intl.NumberFormat("en-KE", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }).format(Number(field.value))
                      : "0"}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Cost (KES)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      step="0.01"
                      {...field}
                      className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 focus:ring-1 focus:ring-white/10 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === "" ? "" : Number(value))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[0.65rem] text-zinc-500 tracking-wide">
                    PREVIEW: KES{" "}
                    {field.value
                      ? new Intl.NumberFormat("en-KE", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }).format(Number(field.value))
                      : "0"}
                  </p>
                  {form.watch("price") > 0 && form.watch("cost") > 0 && (
                    <p className="text-[0.65rem] text-zinc-500 tracking-wide mt-1">
                      MARGIN:{" "}
                      {form.watch("price") > form.watch("cost")
                        ? `${(
                            ((form.watch("price") - form.watch("cost")) / form.watch("price")) *
                            100
                          ).toFixed(1)}%`
                        : "INVALID"}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t border-zinc-800">
              <Button type="button" variant="outline" onClick={handleCancel} className="rounded-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white h-9 px-5 text-xs font-semibold tracking-wider uppercase transition-colors shadow-none">
                Cancel
              </Button>
              <Button type="submit" className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-100 h-9 px-5 text-xs font-semibold tracking-wider uppercase transition-colors shadow-none">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
