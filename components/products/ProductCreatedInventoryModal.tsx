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
import { cn } from "@/lib/utils"

type Store = {
  store_id: string
  name: string
}

type Variant = {
  variant_id: string
  size: string
  color: string
}

const quantitySchema = z
  .record(
    z.string(),
    z.record(
      z.string(),
      z
        .string()
        .regex(/^\d*$/, "Quantity must be a whole number.")
    )
  )

export type BulkInventoryUpdate = {
  variant_id: string
  store_id: string
  quantity: number
}

type ProductCreatedInventoryModalProps = {
  open: boolean
  onClose: () => void
  onSave: (updates: BulkInventoryUpdate[]) => Promise<void>
  styleName: string
  variants: Variant[]
  stores: Store[]
}

type FormValues = {
  quantities: Record<string, Record<string, string>>
  allQuantity: string
}

export function ProductCreatedInventoryModal({
  open,
  onClose,
  onSave,
  styleName,
  variants,
  stores,
}: ProductCreatedInventoryModalProps) {
  const [isSaving, setIsSaving] = React.useState(false)

  const defaultQuantities: Record<string, Record<string, string>> = React.useMemo(() => {
    const result: Record<string, Record<string, string>> = {}
    for (const store of stores) {
      result[store.store_id] = {}
      for (const variant of variants) {
        result[store.store_id][variant.variant_id] = ""
      }
    }
    return result
  }, [stores, variants])

  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        quantities: quantitySchema,
        allQuantity: z.string().optional(),
      })
    ),
    defaultValues: {
      quantities: defaultQuantities,
      allQuantity: "",
    },
    mode: "onChange",
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        quantities: defaultQuantities,
        allQuantity: "",
      })
    }
  }, [open, defaultQuantities, form])

  const quantities = form.watch("quantities")

  const setAllToZero = () => {
    const updated: Record<string, Record<string, string>> = {}
    for (const store of stores) {
      updated[store.store_id] = {}
      for (const variant of variants) {
        updated[store.store_id][variant.variant_id] = "0"
      }
    }
    form.setValue("quantities", updated, { shouldDirty: true, shouldValidate: true })
  }

  const applyBulkQuantity = () => {
    const value = form.getValues("allQuantity") ?? ""
    if (!/^\d+$/.test(value)) {
      toast.error("Enter a whole number for bulk quantity.")
      return
    }
    const updated: Record<string, Record<string, string>> = {}
    for (const store of stores) {
      updated[store.store_id] = {}
      for (const variant of variants) {
        updated[store.store_id][variant.variant_id] = value
      }
    }
    form.setValue("quantities", updated, { shouldDirty: true, shouldValidate: true })
  }

  const handleSave = async (values: FormValues) => {
    const parsed = quantitySchema.safeParse(values.quantities)
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please fix quantity errors.")
      return
    }

    const updates: BulkInventoryUpdate[] = []
    for (const store of stores) {
      const byVariant = values.quantities[store.store_id] ?? {}
      for (const variant of variants) {
        const raw = byVariant[variant.variant_id]
        if (raw == null || raw === "") continue
        const num = Number(raw)
        if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
          toast.error("Quantities must be whole numbers and not negative.")
          return
        }
        updates.push({
          variant_id: variant.variant_id,
          store_id: store.store_id,
          quantity: num,
        })
      }
    }

    if (updates.length === 0) {
      onClose()
      return
    }

    try {
      setIsSaving(true)
      await onSave(updates)
      toast.success("Inventory saved.")
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save inventory.")
    } finally {
      setIsSaving(false)
    }
  }

  const variantCount = variants.length
  const storeCount = stores.length

  // DS v3.0 input class
  const qtyInputClass = cn(
    "bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100",
    "h-8 px-3 w-24 text-right tabular-nums",
    "focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600",
    "[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl p-0 bg-zinc-900 border-zinc-800 text-zinc-100 rounded-sm gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-zinc-800 shrink-0">
          <DialogTitle className="font-editorial text-xl font-bold text-zinc-50">
            Product Created Successfully!
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400 mt-1">
            {styleName} created with {variantCount} variant{variantCount !== 1 ? "s" : ""} across{" "}
            {storeCount} store{storeCount !== 1 ? "s" : ""}. Set initial inventory for each store.
          </DialogDescription>
        </DialogHeader>

        {/* Shortcuts */}
        <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
          <p className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-3">Quick Fill</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex h-7 items-center justify-center rounded-sm border border-zinc-700 bg-transparent px-3 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
              onClick={setAllToZero}
            >
              Set All to 0
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Set all to</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="h-7 w-16 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 px-3 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                {...form.register("allQuantity")}
              />
              <button
                type="button"
                className="inline-flex h-7 items-center justify-center rounded-sm bg-white px-3 text-xs font-semibold uppercase text-zinc-950 hover:bg-zinc-100 transition-colors"
                onClick={applyBulkQuantity}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Store tables */}
        <form
          onSubmit={form.handleSubmit(handleSave)}
          className="flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-auto px-6 py-4">
            {stores.map((store) => (
              <div key={store.store_id} className="mb-6 last:mb-0">
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-zinc-500 mb-3">
                  {store.name}
                </p>
                <div className="overflow-hidden rounded-lg border border-zinc-800">
                  <table className="w-full">
                    <thead className="border-b border-zinc-800">
                      <tr>
                        <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-2 text-left">Variant</th>
                        <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-2 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant) => (
                        <tr key={variant.variant_id} className="border-b border-zinc-800/50 last:border-0">
                          <td className="px-3 py-2.5 text-sm text-zinc-300">
                            {variant.size}, {variant.color}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              className={qtyInputClass}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              value={quantities[store.store_id]?.[variant.variant_id] ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value
                                if (raw === "" || /^\d+$/.test(raw)) {
                                  form.setValue(
                                    `quantities.${store.store_id}.${variant.variant_id}` as const,
                                    raw,
                                    { shouldDirty: true, shouldValidate: true }
                                  )
                                }
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4 shrink-0">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-sm border border-zinc-700 bg-transparent px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
              onClick={onClose}
              disabled={isSaving}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-sm bg-white px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-950 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Set Inventory Now"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
