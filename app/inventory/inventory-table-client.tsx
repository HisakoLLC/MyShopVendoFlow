"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Download, LayoutGrid, LayoutList, Search, AlertTriangle, Pencil, Layers, Trash2, MoreHorizontal, Package, Check } from "lucide-react"
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

function getStoreStockClass(quantity: number | null): string {
  const qty = quantity ?? 0
  if (qty < 0) return "text-sm text-red-400 tabular-nums font-semibold"
  if (qty === 0) return "text-sm text-zinc-600 tabular-nums"
  return "text-sm font-semibold text-zinc-100 tabular-nums"
}

function getTotalStockClass(quantity: number | null): string {
  const qty = quantity ?? 0
  if (qty < 0) return "text-sm text-red-400 tabular-nums font-semibold"
  if (qty === 0) return "text-sm text-zinc-600 tabular-nums"
  return "text-sm font-semibold text-zinc-50 tabular-nums"
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
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <Input
              placeholder="Search by style name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
            />
          </div>

          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-full sm:w-[180px] bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-none py-1">
              <SelectItem value="all" className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 cursor-pointer">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.store_id} value={store.store_id} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 cursor-pointer">
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stockStatus} onValueChange={(v) => setStockStatus(v as StockStatus)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-none py-1">
              <SelectItem value="all" className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 cursor-pointer">All Stock</SelectItem>
              <SelectItem value="in-stock" className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 cursor-pointer">In Stock</SelectItem>
              <SelectItem value="low-stock" className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 cursor-pointer">Low Stock (&lt;5)</SelectItem>
              <SelectItem value="out-of-stock" className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 cursor-pointer">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLayoutView("list")}
              className={`rounded-sm h-9 w-9 flex items-center justify-center transition-colors ${
                layoutView === "list"
                  ? "text-zinc-100 bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
              title="List view"
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutView("grid")}
              className={`rounded-sm h-9 w-9 flex items-center justify-center transition-colors ${
                layoutView === "grid"
                  ? "text-zinc-100 bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <Button 
            variant="outline" 
            onClick={handleExportCSV} 
            className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>

          {someSelected && (
            <Button 
              onClick={openBulkModal} 
              className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
            >
              <Layers className="mr-2 h-3.5 w-3.5" />
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
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 w-[240px]">Style</TableHead>
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
                  <TableCell colSpan={hasMultipleStores ? stores.length + 7 : 8} className="h-24 text-center text-sm text-zinc-500">
                    No inventory found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  return (
                    <TableRow key={item.variant_id} className="border-b border-zinc-700/40 hover:bg-zinc-800/40 transition-colors duration-150 last:border-0">
                      <TableCell className="w-12 px-4 py-3.5">
                        <Checkbox
                          checked={selectedIds.has(item.variant_id)}
                          onCheckedChange={() => toggleRow(item.variant_id)}
                          aria-label={`Select ${item.style_name} ${item.size}/${item.color}`}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800 border border-zinc-800">
                            {item.style_image_url ? (
                              <Image
                                src={item.style_image_url}
                                alt={item.style_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-4 w-4 text-zinc-600" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-zinc-100">
                            {item.style_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-sm text-zinc-300">
                        {item.size} / {item.color}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-mono text-xs text-zinc-400">
                        {item.sku}
                      </TableCell>
                      {hasMultipleStores
                        ? stores.map((store) => {
                            const level = item.stores.find((s) => s.store_id === store.store_id)
                            const qty = level?.quantity_on_hand ?? 0
                            return (
                              <TableCell key={store.store_id} className={`px-4 py-3.5 text-right ${getStoreStockClass(qty)}`}>
                                {qty}
                              </TableCell>
                            )
                          })
                        : (() => {
                            const qty = item.stores[0]?.quantity_on_hand ?? 0
                            return (
                              <TableCell className={`px-4 py-3.5 text-right ${getStoreStockClass(qty)}`}>
                                {qty}
                              </TableCell>
                            )
                          })()}
                      <TableCell className={`px-4 py-3.5 text-right ${getTotalStockClass(item.total_stock)}`}>
                        {item.total_stock}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-sm h-8 w-8 inline-flex items-center justify-center transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-none py-1 min-w-[200px]">
                            <DropdownMenuItem
                              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 cursor-pointer focus:bg-zinc-800/50 focus:text-zinc-50"
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
                              <Pencil className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {stores.map((store) => {
                              const level = item.stores.find((s) => s.store_id === store.store_id)
                              return (
                                <DropdownMenuItem
                                  key={store.store_id}
                                  className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 cursor-pointer focus:bg-zinc-800/50 focus:text-zinc-50"
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
                                  <Layers className="h-4 w-4" /> Adjust {store.name}
                                </DropdownMenuItem>
                              )
                            })}
                            <div className="w-full h-px bg-zinc-800 my-1" />
                            <DropdownMenuItem
                              className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer focus:bg-red-500/10 focus:text-red-300"
                              onClick={() =>
                                setDeletingVariant({
                                  variant_id: item.variant_id,
                                  style_name: item.style_name,
                                  size: item.size,
                                  color: item.color,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" /> Delete
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

        {/* Grid View */}
        <div className={layoutView === "list" ? "hidden" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
          {filtered.length === 0 ? (
            <div className="col-span-full h-24 flex items-center justify-center text-sm text-zinc-500">
              No inventory found matching your filters.
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.variant_id} className="group relative flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700/50 overflow-hidden">
                <div className="relative aspect-square overflow-hidden bg-zinc-950">
                  {item.style_image_url ? (
                    <Image
                      src={item.style_image_url}
                      alt={item.style_name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-10 w-10 text-zinc-800" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => toggleRow(item.variant_id)}
                      className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                        selectedIds.has(item.variant_id)
                          ? "bg-white border-white text-zinc-950"
                          : "bg-black/40 border-white/20 text-white hover:bg-black/60"
                      }`}
                    >
                      {selectedIds.has(item.variant_id) && <Check className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-zinc-500">
                    {item.size} / {item.color}
                  </div>
                  <h3 className="line-clamp-1 font-editorial text-lg font-bold text-zinc-50 leading-tight">
                    {item.style_name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      {item.sku}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[0.65rem] font-semibold text-zinc-500 uppercase tracking-wider">Stock</span>
                      <span className={`font-mono text-base font-bold ${getTotalStockClass(item.total_stock)}`}>
                        {item.total_stock}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/50 p-2">
                  <div className="flex items-center gap-1">
                    <button
                      className="h-8 w-8 rounded-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 flex items-center justify-center transition-colors"
                      title="Edit variant"
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
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {stores.map((store) => {
                      const level = item.stores.find((s) => s.store_id === store.store_id)
                      return (
                        <button
                          key={store.store_id}
                          className="h-8 w-8 rounded-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 flex items-center justify-center transition-colors"
                          title={`Adjust ${store.name}`}
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
                          <Layers className="h-3.5 w-3.5" />
                        </button>
                      )
                    })}
                  </div>
                  <button
                    className="h-8 w-8 rounded-sm text-zinc-500 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-colors"
                    title="Delete variant"
                    onClick={() =>
                      setDeletingVariant({
                        variant_id: item.variant_id,
                        style_name: item.style_name,
                        size: item.size,
                        color: item.color,
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
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
      <AlertDialog open={!!deletingVariant} onOpenChange={() => setDeletingVariant(null)}>
        <AlertDialogContent className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-editorial text-xl font-bold text-zinc-50">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete the variant{" "}
              <span className="font-semibold text-zinc-200">
                {deletingVariant?.style_name} ({deletingVariant?.size}/{deletingVariant?.color})
              </span>{" "}
              and all its associated inventory data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
            <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-sm h-10 px-6 transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
              className="bg-red-600 text-white hover:bg-red-700 rounded-sm h-10 px-6 transition-colors shadow-lg shadow-red-900/20"
            >
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
                {deletePending ? "Deleting..." : "Delete Variant"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
