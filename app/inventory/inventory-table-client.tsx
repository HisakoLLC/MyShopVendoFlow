"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import { Download, Search, AlertTriangle, Pencil, Layers, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { InventoryAdjustmentModal } from "@/components/inventory/InventoryAdjustmentModal"
import { BulkInventoryAdjustmentModal } from "@/components/inventory/BulkInventoryAdjustmentModal"
import { VariantCellEditor } from "@/components/products/VariantCellEditor"
import { updateProductVariant, deleteProductStyle } from "@/app/products/actions"

type Store = {
  store_id: string
  name: string
}

type InventoryItem = {
  variant_id: string
  style_id: string
  style_name: string
  style_image_url: string | null
  size: string
  color: string
  sku: string
  price: number
  cost: number
  stores: Array<{
    store_id: string
    store_name: string
    quantity_on_hand: number | null
    quantity_reserved: number | null
  }>
  total_stock: number
}

type InventoryTableClientProps = {
  stores: Store[]
  inventory: InventoryItem[]
}

type StockStatus = "all" | "in-stock" | "low-stock" | "out-of-stock"

function getStockColor(quantity: number | null): string {
  const qty = quantity ?? 0
  if (qty < 0) return "text-red-600 dark:text-red-400 font-semibold"
  if (qty === 0) return "text-red-600 dark:text-red-400"
  if (qty < 5) return "text-yellow-600 dark:text-yellow-400"
  if (qty <= 10) return "text-yellow-700 dark:text-yellow-500"
  return "text-green-600 dark:text-green-400"
}

function getRowBgColor(totalStock: number, hasNegative: boolean): string {
  if (hasNegative) return "bg-red-50 dark:bg-red-950/20"
  if (totalStock === 0) return "bg-red-50/50 dark:bg-red-950/10"
  return ""
}

export function InventoryTableClient({ stores, inventory }: InventoryTableClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedStore, setSelectedStore] = React.useState<string>("all")
  const [stockStatus, setStockStatus] = React.useState<StockStatus>("all")
  const [adjustingVariant, setAdjustingVariant] = React.useState<{
    variant: {
      variant_id: string
      style_name: string
      size: string
      color: string
      sku: string
    }
    store: {
      store_id: string
      name: string
    }
    currentStock: number
  } | null>(null)
  const [editingVariant, setEditingVariant] = React.useState<{
    variant_id: string
    style_name: string
    size: string
    color: string
    sku: string
    price: number
    cost: number
  } | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [bulkModalOpen, setBulkModalOpen] = React.useState(false)
  const [deletingStyle, setDeletingStyle] = React.useState<{
    style_id: string
    style_name: string
  } | null>(null)
  const [deletePending, startDeleteTransition] = React.useTransition()

  const filtered = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return inventory.filter((item) => {
      const matchesSearch =
        !query ||
        item.style_name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        `${item.size} ${item.color}`.toLowerCase().includes(query)

      const matchesStore =
        selectedStore === "all" ||
        item.stores.some((s) => s.store_id === selectedStore && (s.quantity_on_hand ?? 0) > 0)

      let matchesStatus = true
      if (stockStatus === "in-stock") {
        matchesStatus = item.total_stock > 0 && item.stores.every((s) => (s.quantity_on_hand ?? 0) >= 0)
      } else if (stockStatus === "low-stock") {
        matchesStatus = item.total_stock > 0 && item.total_stock < 5
      } else if (stockStatus === "out-of-stock") {
        matchesStatus = item.total_stock === 0 || item.stores.some((s) => (s.quantity_on_hand ?? 0) < 0)
      }

      return matchesSearch && matchesStore && matchesStatus
    })
  }, [inventory, searchQuery, selectedStore, stockStatus])

  const handleExportCSV = () => {
    const headers = [
      "Style Name",
      "Variant",
      "SKU",
      ...stores.map((s) => `${s.name} Stock`),
      "Total Stock",
    ]

    const rows = inventory.map((item) => [
      item.style_name,
      `${item.size} / ${item.color}`,
      item.sku,
      ...stores.map((store) => {
        const level = item.stores.find((s) => s.store_id === store.store_id)
        return String(level?.quantity_on_hand ?? 0)
      }),
      String(item.total_stock),
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `inventory-report-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasMultipleStores = stores.length > 1
  const filteredIds = React.useMemo(() => new Set(filtered.map((i) => i.variant_id)), [filtered])
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i.variant_id))
  const someSelected = selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const toggleRow = (variantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(variantId)) next.delete(variantId)
      else next.add(variantId)
      return next
    })
  }

  const openBulkModal = () => setBulkModalOpen(true)
  const closeBulkModal = () => {
    setBulkModalOpen(false)
    setSelectedIds(new Set())
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search by style name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.store_id} value={store.store_id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stockStatus} onValueChange={(v) => setStockStatus(v as StockStatus)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock (&lt;5)</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          {someSelected && (
            <Button onClick={openBulkModal} className="w-full sm:w-auto">
              <Layers className="mr-2 h-4 w-4" />
              Bulk adjust ({selectedIds.size})
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Style</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU</TableHead>
                  {hasMultipleStores &&
                    stores.map((store) => (
                      <TableHead key={store.store_id} className="text-right">
                        {store.name}
                      </TableHead>
                    ))}
                  {!hasMultipleStores && <TableHead className="text-right">Stock</TableHead>}
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasMultipleStores ? stores.length + 6 : 7} className="h-24 text-center">
                      No inventory found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const hasNegative = item.stores.some((s) => (s.quantity_on_hand ?? 0) < 0)
                    const rowBg = getRowBgColor(item.total_stock, hasNegative)

                    return (
                      <TableRow key={item.variant_id} className={rowBg}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(item.variant_id)}
                            onCheckedChange={() => toggleRow(item.variant_id)}
                            aria-label={`Select ${item.style_name} ${item.size}/${item.color}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                              {item.style_image_url ? (
                                <Image
                                  src={item.style_image_url}
                                  alt={item.style_name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {item.style_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300">
                          {item.size} / {item.color}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                          {item.sku}
                        </TableCell>
                        {hasMultipleStores
                          ? stores.map((store) => {
                              const level = item.stores.find((s) => s.store_id === store.store_id)
                              const qty = level?.quantity_on_hand ?? 0
                              const colorClass = getStockColor(qty)

                              return (
                                <TableCell key={store.store_id} className={`text-right ${colorClass}`}>
                                  {qty < 0 && <AlertTriangle className="mr-1 inline h-4 w-4" />}
                                  {qty}
                                </TableCell>
                              )
                            })
                          : (() => {
                              const qty = item.stores[0]?.quantity_on_hand ?? 0
                              const colorClass = getStockColor(qty)
                              return (
                                <TableCell className={`text-right ${colorClass}`}>
                                  {qty < 0 && <AlertTriangle className="mr-1 inline h-4 w-4" />}
                                  {qty}
                                </TableCell>
                              )
                            })()}
                        <TableCell className={`text-right font-medium ${getStockColor(item.total_stock)}`}>
                          {item.total_stock}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setEditingVariant({
                                  variant_id: item.variant_id,
                                  style_name: item.style_name,
                                  size: item.size,
                                  color: item.color,
                                  sku: item.sku,
                                  price: item.price,
                                  cost: item.cost,
                                })
                              }
                              title="Edit price, cost, SKU"
                            >
                              <Pencil className="mr-1.5 h-4 w-4" />
                              Edit
                            </Button>
                            {stores.map((store) => {
                              const level = item.stores.find((s) => s.store_id === store.store_id)
                              return (
                                <Button
                                  key={store.store_id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setAdjustingVariant({
                                      variant: {
                                        variant_id: item.variant_id,
                                        style_name: item.style_name,
                                        size: item.size,
                                        color: item.color,
                                        sku: item.sku,
                                      },
                                      store: {
                                        store_id: store.store_id,
                                        name: store.name,
                                      },
                                      currentStock: level?.quantity_on_hand ?? 0,
                                    })
                                  }
                                >
                                  Adjust {hasMultipleStores ? store.name : ""}
                                </Button>
                              )
                            })}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                              title="Delete this product style permanently"
                              disabled={deletePending}
                              onClick={() =>
                                setDeletingStyle({ style_id: item.style_id, style_name: item.style_name })
                              }
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Adjustment Modal */}
      {adjustingVariant && (
        <InventoryAdjustmentModal
          variant={adjustingVariant.variant}
          store={adjustingVariant.store}
          currentStock={adjustingVariant.currentStock}
          onClose={() => setAdjustingVariant(null)}
          onSuccess={() => {
            setAdjustingVariant(null)
            router.refresh()
          }}
        />
      )}

      {/* Bulk adjust modal */}
      <BulkInventoryAdjustmentModal
        open={bulkModalOpen}
        onClose={closeBulkModal}
        onSuccess={() => {
          closeBulkModal()
          router.refresh()
        }}
        stores={stores}
        selectedVariantIds={Array.from(selectedIds)}
      />

      {/* Delete style confirmation */}
      <AlertDialog.Root
        open={deletingStyle !== null}
        onOpenChange={(open) => !open && setDeletingStyle(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-950">
            <AlertDialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Delete &quot;{deletingStyle?.style_name ?? ""}&quot; permanently?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This will remove the entire style and all its variants and inventory levels from Products and Inventory. This cannot be undone. Products with sales history cannot be deleted.
            </AlertDialog.Description>

            <div className="mt-4 flex items-center justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" disabled={deletePending}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  disabled={deletePending}
                  onClick={() => {
                    if (!deletingStyle) return
                    startDeleteTransition(async () => {
                      try {
                        await deleteProductStyle(deletingStyle.style_id)
                        toast.success("Product deleted.")
                        setDeletingStyle(null)
                        router.refresh()
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed to delete.")
                      } finally {
                        setDeletingStyle(null)
                      }
                    })
                  }}
                >
                  {deletePending ? "Deleting..." : "Delete"}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Edit variant (price/cost/SKU) modal */}
      {editingVariant && (
        <VariantCellEditor
          open={true}
          size={editingVariant.size}
          color={editingVariant.color}
          defaultSku={editingVariant.sku}
          defaultPrice={editingVariant.price}
          defaultCost={editingVariant.cost}
          onSave={async (data) => {
            try {
              await updateProductVariant(editingVariant.variant_id, data)
              toast.success("Variant updated.")
              setEditingVariant(null)
              router.refresh()
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to update variant.")
            }
          }}
          onCancel={() => setEditingVariant(null)}
        />
      )}
    </>
  )
}
