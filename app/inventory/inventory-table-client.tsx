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
  if (qty < 0) return "text-sm text-destructive tabular-nums font-semibold"
  if (qty === 0) return "text-sm text-muted-foreground tabular-nums"
  return "text-sm font-semibold text-foreground tabular-nums"
}

function getTotalStockClass(quantity: number | null): string {
  const qty = quantity ?? 0
  if (qty < 0) return "text-sm text-destructive tabular-nums font-semibold"
  if (qty === 0) return "text-sm text-muted-foreground tabular-nums"
  return "text-sm font-semibold text-foreground tabular-nums"
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by style name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]"
            />
          </div>

          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border rounded-lg shadow-md py-1 text-popover-foreground">
              <SelectItem value="all" className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.store_id} value={store.store_id} className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stockStatus} onValueChange={(v) => setStockStatus(v as StockStatus)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border rounded-lg shadow-md py-1 text-popover-foreground">
              <SelectItem value="all" className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">All Stock</SelectItem>
              <SelectItem value="in-stock" className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">In Stock</SelectItem>
              <SelectItem value="low-stock" className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">Low Stock (&lt;5)</SelectItem>
              <SelectItem value="out-of-stock" className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLayoutView("list")}
              className={`rounded-md h-9 w-9 flex items-center justify-center transition-colors ${
                layoutView === "list"
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              title="List view"
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutView("grid")}
              className={`rounded-md h-9 w-9 flex items-center justify-center transition-colors ${
                layoutView === "grid"
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
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
            className="border border-border text-foreground hover:bg-accent rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>

          {someSelected && (
            <Button 
              onClick={openBulkModal} 
              className="bg-[#E8400C] text-white hover:bg-[#c73508] rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors shadow-sm"
            >
              <Layers className="mr-2 h-3.5 w-3.5" />
              Bulk adjust ({selectedIds.size})
            </Button>
          )}
        </div>

        {/* List: Table */}
        <div className={layoutView === "grid" ? "hidden" : "block rounded-lg border border-border bg-card overflow-hidden shadow-sm"}>
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-12 px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground" aria-label="Select row">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground w-[240px]">Style</TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Variant</TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">SKU</TableHead>
                {hasMultipleStores &&
                  stores.map((store) => (
                    <TableHead key={store.store_id} className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">
                      {store.name}
                    </TableHead>
                  ))}
                {!hasMultipleStores && <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Stock</TableHead>}
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Total</TableHead>
                <TableHead className="px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasMultipleStores ? stores.length + 7 : 8} className="h-24 text-center text-sm text-muted-foreground">
                    No inventory found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  return (
                    <TableRow key={item.variant_id} className="border-b border-border hover:bg-accent/50 transition-colors duration-150 last:border-0">
                      <TableCell className="w-12 px-4 py-3.5">
                        <Checkbox
                          checked={selectedIds.has(item.variant_id)}
                          onCheckedChange={() => toggleRow(item.variant_id)}
                          aria-label={`Select ${item.style_name} ${item.size}/${item.color}`}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted border border-border">
                            {item.style_image_url ? (
                              <Image
                                src={item.style_image_url}
                                alt={item.style_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {item.style_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                        {item.size} / {item.color}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
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
                            <button className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md h-8 w-8 inline-flex items-center justify-center transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border border-border rounded-lg shadow-md py-1 min-w-[200px] text-popover-foreground">
                            <DropdownMenuItem
                              className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer"
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
                                  className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer"
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
                            <div className="w-full h-px bg-border my-1" />
                            <DropdownMenuItem
                              className="flex items-center gap-3 px-4 py-2 text-sm text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
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
            <div className="col-span-full h-24 flex items-center justify-center text-sm text-muted-foreground">
              No inventory found matching your filters.
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.variant_id} className="group relative flex flex-col rounded-lg border border-border bg-card text-card-foreground transition-all hover:border-border/80 shadow-sm overflow-hidden">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {item.style_image_url ? (
                    <Image
                      src={item.style_image_url}
                      alt={item.style_name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => toggleRow(item.variant_id)}
                      className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                        selectedIds.has(item.variant_id)
                          ? "bg-[#E8400C] border-[#E8400C] text-white"
                          : "bg-black/40 border-white/20 text-white hover:bg-black/60"
                      }`}
                    >
                      {selectedIds.has(item.variant_id) && <Check className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {item.size} / {item.color}
                  </div>
                  <h3 className="line-clamp-1 font-sans text-lg font-bold text-foreground leading-tight">
                    {item.style_name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.sku}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider">Stock</span>
                      <span className={`font-mono text-base font-bold ${getTotalStockClass(item.total_stock)}`}>
                        {item.total_stock}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border bg-muted/20 p-2">
                  <div className="flex items-center gap-1">
                    <button
                      className="h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center transition-colors"
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
                          className="h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center transition-colors"
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
                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
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
        <AlertDialogContent className="bg-card border border-border text-card-foreground rounded-lg max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans text-xl font-bold text-foreground">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the variant{" "}
              <span className="font-semibold text-foreground">
                {deletingVariant?.style_name} ({deletingVariant?.size}/{deletingVariant?.color})
              </span>{" "}
              and all its associated inventory data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
            <AlertDialogCancel className="bg-transparent border border-border text-foreground hover:bg-accent rounded-md h-10 px-6 transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md h-10 px-6 transition-colors shadow-sm"
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
