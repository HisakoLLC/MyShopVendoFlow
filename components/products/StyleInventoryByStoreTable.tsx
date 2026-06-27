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
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        No variants yet for this style. Create variants to start tracking inventory by store.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sans text-xl font-bold text-foreground mb-1">Inventory by Store</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Products are shared across all stores, but inventory is tracked separately per store. Set how many units of <span className="text-foreground font-medium">{styleName}</span> you have at each location. Click any cell to edit.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground px-4 py-3 text-left">Variant</th>
              <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground px-4 py-3 text-left">SKU</th>
              {stores.map((store) => (
                <th key={store.store_id} className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground px-4 py-3 text-right">
                  {store.name}
                </th>
              ))}
              <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.variant_id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-sm text-foreground">
                  {row.size} / {row.color}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
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
                            className="h-8 w-20 text-right bg-background border-border text-foreground rounded-md focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-semibold uppercase text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center justify-center rounded-md bg-[#E8400C] px-3 text-xs font-semibold uppercase text-white hover:bg-[#c73508] transition-colors"
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
                          className={`inline-flex min-w-[2.5rem] items-center justify-end text-sm tabular-nums hover:underline transition-colors ${qty === 0 ? "text-muted-foreground/60" : "font-semibold text-foreground font-mono"}`}
                        >
                          {qty}
                        </button>
                      )}
                    </td>
                  )
                })}
                <td className={`px-4 py-3 text-right text-sm tabular-nums ${row.total_stock === 0 ? "text-muted-foreground/60" : "font-semibold text-foreground font-mono"}`}>
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
