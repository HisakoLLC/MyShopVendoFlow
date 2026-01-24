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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Variant: {size} - {color}</DialogTitle>
          <DialogDescription>
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
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., OLS-M-NAV"
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Uppercase letters, numbers, and hyphens only
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (KES)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      step="0.01"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === "" ? "" : Number(value))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Preview: KES{" "}
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
                  <FormLabel>Cost (KES)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      step="0.01"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === "" ? "" : Number(value))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Preview: KES{" "}
                    {field.value
                      ? new Intl.NumberFormat("en-KE", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }).format(Number(field.value))
                      : "0"}
                  </p>
                  {form.watch("price") > 0 && form.watch("cost") > 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Margin:{" "}
                      {form.watch("price") > form.watch("cost")
                        ? `${(
                            ((form.watch("price") - form.watch("cost")) / form.watch("price")) *
                            100
                          ).toFixed(1)}%`
                        : "Invalid"}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
