\"use client\"

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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

  const copyFromFirstStore = () => {
    if (stores.length < 2) return
    const sourceId = stores[0].store_id
    const sourceValues = quantities[sourceId]
    if (!sourceValues) return

    const updated: Record<string, Record<string, string>> = { ...quantities }
    for (let i = 1; i < stores.length; i++) {
      const targetId = stores[i].store_id
      updated[targetId] = { ...sourceValues }
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-h-[85vh] w-full max-w-3xl overflow-hidden p-0">
        <DialogHeader className="space-y-1 px-6 pt-6">
          <DialogTitle>Product Created Successfully!</DialogTitle>
          <DialogDescription>
            {styleName} created with {variantCount} variant{variantCount !== 1 ? "s" : ""} across{" "}
            {storeCount} store{storeCount !== 1 ? "s" : ""}. Set initial inventory for each store.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Products are shared across all stores, but inventory is tracked separately per store. Set how many
          units you have at each location.
        </div>

        <div className="px-6 pb-3">
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
            <span className="font-medium">Shortcuts:</span>
            <Button type="button" size="sm" variant="outline" onClick={setAllToZero}>
              Set all to 0
            </Button>
            <div className="flex items-center gap-2">
              <span>Set all to</span>
              <Input
                className="h-8 w-20"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                {...form.register("allQuantity")}
              />
              <Button type="button" size="sm" variant="outline" onClick={applyBulkQuantity}>
                Apply
              </Button>
            </div>
            {stores.length > 1 && (
              <Button type="button" size="sm" variant="outline" onClick={copyFromFirstStore}>
                Copy from {stores[0].name} to all stores
              </Button>
            )}
          </div>
        </div>

        <form
          onSubmit={form.handleSubmit(handleSave)}
          className="flex max-h-[45vh] flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-auto px-6">
            {stores.map((store) => (
              <div key={store.store_id} className="mb-6 last:mb-4">
                <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {store.name}
                </div>
                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50/80 dark:bg-zinc-900/60">
                        <TableHead className="w-1/2">Variant</TableHead>
                        <TableHead className="w-1/2 text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant) => (
                        <TableRow key={variant.variant_id}>
                          <TableCell className="text-sm">
                            <div className="font-medium">
                              {variant.size}, {variant.color}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              className={cn(
                                "inline-block h-9 w-24 text-right",
                                "[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              )}
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Skip for Now
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Set Inventory Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

