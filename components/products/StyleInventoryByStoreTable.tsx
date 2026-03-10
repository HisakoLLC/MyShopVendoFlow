"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

type Store = {
  store_id: string
  name: string
}

type InventoryRow = {
  variant_id: string
  size: string
  color: string
  sku: string
  stores: Array<{
    store_id: string
    store_name: string
    quantity_on_hand: number
  }>
  total_stock: number
}

type Props = {
  stores: Store[]
  inventory: InventoryRow[]
  styleName: string
}

type EditingCell = {
  variant_id: string
  store_id: string
}

export function StyleInventoryByStoreTable({ stores, inventory, styleName }: Props) {
  const [editing, setEditing] = React.useState<EditingCell | null>(null)
  const [value, setValue] = React.useState<string>("")
  const [saving, setSaving] = React.useState(false)
  const [rows, setRows] = React.useState<InventoryRow[]>(inventory)

  React.useEffect(() => {
    setRows(inventory)
  }, [inventory])

  const getQuantityColor = (qty: number) => {
    if (qty === 0) return "text-red-600 dark:text-red-400"
    if (qty > 0 && qty < 5) return "text-yellow-600 dark:text-yellow-400"
    return "text-zinc-900 dark:text-zinc-100"
  }

  const handleCellClick = (variant_id: string, store_id: string, current: number) => {
    setEditing({ variant_id, store_id })
    setValue(String(current))
  }

  const handleCancel = () => {
    setEditing(null)
    setValue("")
  }

  const handleSave = async () => {
    if (!editing) return
    const trimmed = value.trim()
    if (!/^\d+$/.test(trimmed)) {
      toast.error("Quantity must be a whole number and not negative.")
      return
    }
    const qty = Number(trimmed)

    try {
      setSaving(true)
      const res = await fetch("/api/inventory/bulk-set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates: [
            {
              variant_id: editing.variant_id,
              store_id: editing.store_id,
              quantity: qty,
            },
          ],
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to update inventory.")
      }

      setRows((prev) =>
        prev.map((row) => {
          if (row.variant_id !== editing.variant_id) return row
          const updatedStores = row.stores.map((s) =>
            s.store_id === editing.store_id ? { ...s, quantity_on_hand: qty } : s
          )
          const total = updatedStores.reduce(
            (sum, s) => sum + (s.quantity_on_hand ?? 0),
            0
          )
          return { ...row, stores: updatedStores, total_stock: total }
        })
      )

      toast.success("Inventory updated.")
      setEditing(null)
      setValue("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update inventory.")
    } finally {
      setSaving(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-background-dark dark:text-zinc-300">
        No variants yet for this style. Create variants to start tracking inventory by store.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Inventory by Store
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xl">
          Products are shared across all stores, but inventory is tracked separately per store. Set how
          many units of <span className="font-medium">{styleName}</span> you have at each location.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-background dark:border-zinc-800 dark:bg-background-dark">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48 dark:text-zinc-100">Variant</TableHead>
              <TableHead className="w-40 dark:text-zinc-100">SKU</TableHead>
              {stores.map((store) => (
                <TableHead key={store.store_id} className="text-right dark:text-zinc-100">
                  {store.name}
                </TableHead>
              ))}
              <TableHead className="text-right dark:text-zinc-100">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.variant_id}>
                <TableCell className="text-sm text-zinc-900 dark:text-zinc-100">
                  {row.size} / {row.color}
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
                  {row.sku}
                </TableCell>
                {stores.map((store) => {
                  const level = row.stores.find((s) => s.store_id === store.store_id)
                  const qty = level?.quantity_on_hand ?? 0
                  const isEditing =
                    editing?.variant_id === row.variant_id &&
                    editing?.store_id === store.store_id

                  return (
                    <TableCell
                      key={store.store_id}
                      className={`text-right align-middle ${getQuantityColor(qty)}`}
                    >
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            className="h-8 w-20 text-right"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                          />
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button size="xs" onClick={handleSave} disabled={saving}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCellClick(row.variant_id, store.store_id, qty)}
                          className="inline-flex min-w-[2.5rem] items-center justify-end text-sm hover:underline"
                        >
                          {qty}
                        </button>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell
                  className={`text-right font-medium ${getQuantityColor(row.total_stock)}`}
                >
                  {row.total_stock}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

