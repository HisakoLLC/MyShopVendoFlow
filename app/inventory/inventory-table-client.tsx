"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import { Download, LayoutGrid, LayoutList, Search, AlertTriangle, Pencil, Layers, Trash2, MoreHorizontal, Package } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { updateProductVariant, deleteProductVariant } from "@/app/products/actions"

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

function getStockColorClass(quantity: number | null): string {
  const qty = quantity ?? 0
  if (qty < 0) return "text-sm text-red-400 tabular-nums font-semibold"
  if (qty === 0) return "text-sm text-zinc-600 tabular-nums font-semibold"
  return "text-sm text-zinc-100 tabular-nums font-semibold"
}

export function InventoryTableClient({ stores, inventory }: InventoryTableClientProps) {
  const router = useRouter()
  const [layoutView, setLayoutView] = React.useState<"list" | "grid">("list")
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
  const [deletingVariant, setDeletingVariant] = React.useState<{
    variant_id: string
    style_name: string
    size: string
    color: string
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
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-700/50 bg-zinc-900 p-4 sm:flex-row sm:items-center">
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

          <div className="flex items-center rounded-sm border border-zinc-700 bg-zinc-800/50 p-0.5">
            <button
              type="button"
              onClick={() => setLayoutView("list")}
              className={`rounded-md p-2 transition-colors ${
                layoutView === "list"
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="List view"
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutView("grid")}
              className={`rounded-md p-2 transition-colors ${
                layoutView === "grid"
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

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

        {/* List: Table */}
        <div className={layoutView === "grid" ? "hidden" : "block rounded-lg border border-zinc-700/50 bg-zinc-900 overflow-hidden"}>
          <Table>
            <TableHeader className="bg-zinc-900">
              <TableRow className="border-b-2 border-zinc-700 hover:bg-transparent">
                <TableHead className="w-12 px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500" aria-label="Select row">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 w-[200px]">Style</TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Variant</TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">SKU</TableHead>
                {hasMultipleStores &&
                  stores.map((store) => (
                    <TableHead key={store.store_id} className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">
                      {store.name}
                    </TableHead>
                  ))}
                {!hasMultipleStores && <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">Stock</TableHead>}
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">Total</TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasMultipleStores ? stores.length + 7 : 8} className="h-24 text-center">
                    No inventory found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  return (
                    <TableRow key={item.variant_id} className="border-b border-zinc-700/40 hover:bg-zinc-800/40 transition-colors duration-100 last:border-0">
                      <TableCell className="w-12 px-4 py-3.5">
                        <Checkbox
                          checked={selectedIds.has(item.variant_id)}
                          onCheckedChange={() => toggleRow(item.variant_id)}
                          aria-label={`Select ${item.style_name} ${item.size}/${item.color}`}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={item.style_image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-sm" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-zinc-700 bg-zinc-800"}>
                            {item.style_image_url ? (
                              <Image
                                src={item.style_image_url}
                                alt={item.style_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-zinc-600" />
                            )}
                          </div>
                          <div className="font-medium text-zinc-100">
                            {item.style_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-zinc-300">
                        {item.size} / {item.color}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-mono text-xs text-zinc-400 tracking-wide">
                        {item.sku}
                      </TableCell>
                      {hasMultipleStores
                        ? stores.map((store) => {
                            const level = item.stores.find((s) => s.store_id === store.store_id)
                            const qty = level?.quantity_on_hand ?? 0
                            return (
                              <TableCell key={store.store_id} className={`px-4 py-3.5 text-right ${getStockColorClass(qty)}`}>
                                {qty}
                              </TableCell>
                            )
                          })
                        : (() => {
                            const qty = item.stores[0]?.quantity_on_hand ?? 0
                            return (
                              <TableCell className={`px-4 py-3.5 text-right ${getStockColorClass(qty)}`}>
                                {qty}
                              </TableCell>
                            )
                          })()}
                      <TableCell className={`px-4 py-3.5 text-right ${getStockColorClass(item.total_stock)}`}>
                        {item.total_stock}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex w-8 h-8 rounded-sm hover:bg-zinc-800 items-center justify-center transition-colors text-zinc-500">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg">
                            <DropdownMenuItem
                              className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 px-3 py-2 cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
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
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {stores.map((store) => {
                              const level = item.stores.find((s) => s.store_id === store.store_id)
                              return (
                                <DropdownMenuItem
                                  key={store.store_id}
                                  className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 px-3 py-2 cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
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
                                  <Layers className="mr-2 h-4 w-4" /> Adjust {store.name}
                                </DropdownMenuItem>
                              )
                            })}
                            <DropdownMenuItem
                              className="text-red-400 hover:bg-red-400/10 hover:text-red-300 px-3 py-2 cursor-pointer focus:bg-red-400/10 focus:text-red-300"
                              onClick={() =>
                                setDeletingVariant({
                                  variant_id: item.variant_id,
                                  style_name: item.style_name,
                                  size: item.size,
                                  color: item.color,
                                })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Grid: Cards */}
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${layoutView === "list" ? "hidden" : "block"}`}>
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
              No inventory found matching your filters.
            </div>
          ) : (
            filtered.map((item) => {
              return (
                <div
                  key={item.variant_id}
                  className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-4"
                >
                  <div className="flex gap-3">
                    <div className={item.style_image_url ? "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm" : "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-sm border border-zinc-700 bg-zinc-800"}>
                      {item.style_image_url ? (
                        <Image
                          src={item.style_image_url}
                          alt={item.style_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-zinc-100 truncate">
                        {item.style_name}
                      </div>
                      <div className="mt-0.5 text-sm text-zinc-300">
                        {item.size} / {item.color}
                      </div>
                      <div className="mt-1 font-mono text-xs text-zinc-400 tracking-wide">
                        {item.sku}
                      </div>
                      <div className={`mt-2 ${getStockColorClass(item.total_stock)}`}>
                        Total: {item.total_stock}
                        {item.total_stock < 0 && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-nowrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 px-1.5 text-[10px] font-medium"
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
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {stores.length > 0 && (() => {
                      const firstStore = stores[0]
                      const level = item.stores.find((s) => s.store_id === firstStore.store_id)
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 flex-1 px-1.5 text-[10px] font-medium"
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
                                store_id: firstStore.store_id,
                                name: firstStore.name,
                              },
                              currentStock: level?.quantity_on_hand ?? 0,
                            })
                          }
                          title={hasMultipleStores ? `Adjust ${firstStore.name}` : "Adjust stock"}
                        >
                          <Layers className="h-3 w-3" />
                        </Button>
                      )
                    })()}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 px-1.5 text-[10px] font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                      title="Delete this variant"
                      disabled={deletePending}
                      onClick={() =>
                        setDeletingVariant({
                          variant_id: item.variant_id,
                          style_name: item.style_name,
                          size: item.size,
                          color: item.color,
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
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

      {/* Delete variant confirmation */}
      <AlertDialog.Root
        open={deletingVariant !== null}
        onOpenChange={(open) => !open && setDeletingVariant(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-200 bg-white p-6 shadow-2xl outline-none">
            <AlertDialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Delete this variant?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {deletingVariant && (
                <>
                  Remove <strong>{deletingVariant.style_name} – {deletingVariant.size} / {deletingVariant.color}</strong> only.
                  This variant and its stock will be deleted. The style and other variants will remain. This cannot be undone.
                </>
              )}
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
                    if (!deletingVariant) return
                    startDeleteTransition(async () => {
                      try {
                        await deleteProductVariant(deletingVariant.variant_id)
                        toast.success("Variant deleted.")
                        setDeletingVariant(null)
                        router.refresh()
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed to delete.")
                      } finally {
                        setDeletingVariant(null)
                      }
                    })
                  }}
                >
                  {deletePending ? "Deleting..." : "Delete variant"}
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
