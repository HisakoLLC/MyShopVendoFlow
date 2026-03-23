"use client"

import * as React from "react"
import { toast } from "sonner"
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
      <div className="rounded-sm border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-10 text-center text-sm text-zinc-500">
        No variants yet for this style. Create variants to start tracking inventory by store.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-editorial text-xl font-bold text-zinc-50 mb-1">Inventory by Store</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Products are shared across all stores, but inventory is tracked separately per store. Set how many units of <span className="text-zinc-300 font-medium">{styleName}</span> you have at each location. Click any cell to edit.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="border-b-2 border-zinc-700">
            <tr>
              <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3 text-left">Variant</th>
              <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3 text-left">SKU</th>
              {stores.map((store) => (
                <th key={store.store_id} className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3 text-right">
                  {store.name}
                </th>
              ))}
              <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.variant_id} className="border-b border-zinc-700/40 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-sm text-zinc-300">
                  {row.size} / {row.color}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {row.sku}
                </td>
                {stores.map((store) => {
                  const level = row.stores.find((s) => s.store_id === store.store_id)
                  const qty = level?.quantity_on_hand ?? 0
                  const isEditing =
                    editing?.variant_id === row.variant_id &&
                    editing?.store_id === store.store_id

                  return (
                    <td key={store.store_id} className="px-4 py-3 text-right align-middle">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            className="h-8 w-20 text-right bg-zinc-800 border-zinc-700 text-zinc-100 rounded-sm focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="inline-flex h-8 items-center justify-center rounded-sm border border-zinc-700 bg-transparent px-3 text-xs font-semibold uppercase text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center justify-center rounded-sm bg-white px-3 text-xs font-semibold uppercase text-zinc-950 hover:bg-zinc-100 transition-colors"
                            onClick={handleSave}
                            disabled={saving}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCellClick(row.variant_id, store.store_id, qty)}
                          className={`inline-flex min-w-[2.5rem] items-center justify-end text-sm tabular-nums hover:underline transition-colors ${qty === 0 ? "text-zinc-600" : "font-semibold text-zinc-100"}`}
                        >
                          {qty}
                        </button>
                      )}
                    </td>
                  )
                })}
                <td className={`px-4 py-3 text-right text-sm tabular-nums ${row.total_stock === 0 ? "text-zinc-600" : "font-semibold text-zinc-50"}`}>
                  {row.total_stock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
