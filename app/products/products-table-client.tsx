"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import { Archive, ArchiveRestore, Pencil, Percent, Trash2, Package } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

import type { Tables } from "@/types/database"
import { ProductsFilters } from "@/components/products/ProductsFilters"
import { Checkbox } from "@/components/ui/checkbox"
import { archiveProductStyle, unarchiveProductStyle, deleteProductStyle, applyStyleDiscount, applyBulkStyleDiscount } from "./actions"

type CategoryRow = Tables<"categories">
type SeasonRow = Tables<"seasons">

export type ProductStyleListRow = Pick<
  Tables<"product_styles">,
  "style_id" | "name" | "base_price" | "cost" | "image_url" | "category_id" | "season_id"
> & {
  archived?: boolean | null
  discount_percent?: number | null
  discount_ends_at?: string | null
  categories?: Pick<CategoryRow, "name"> | null
  seasons?: Pick<SeasonRow, "name"> | null
}

function formatKes(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value)
}

function marginPercent(basePrice: number, cost: number) {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0
  return ((basePrice - cost) / basePrice) * 100
}

function marginBadgeClass(margin: number) {
  if (margin > 50) return "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
  if (margin >= 25) return "bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
  return "bg-red-400/10 text-red-400 border border-red-400/20 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
}

/** True if discount should be applied (percent > 0 and not past end date). */
function isDiscountActive(
  discountPercent: number | null | undefined,
  endsAt: string | null | undefined
): boolean {
  const pct = Number(discountPercent) || 0
  if (pct <= 0) return false
  if (!endsAt) return true
  try {
    return new Date(endsAt) > new Date()
  } catch {
    return true
  }
}

function effectivePrice(
  basePrice: number,
  discountPercent: number | null | undefined,
  endsAt?: string | null
): number {
  if (!isDiscountActive(discountPercent, endsAt)) return basePrice
  const pct = Number(discountPercent) || 0
  return Math.round(basePrice * (1 - pct / 100))
}

function formatEndsAt(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" })
  } catch {
    return ""
  }
}

// DS v3 Alert Dialog content style
const alertContentClass =
  "fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sm border border-border bg-card text-card-foreground p-6 shadow-2xl outline-none"
const alertCancelBtnClass =
  "inline-flex h-9 items-center justify-center rounded-sm border border-border bg-transparent px-5 text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground hover:border-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
const alertConfirmBtnClass =
  "inline-flex h-9 items-center justify-center rounded-sm bg-[#E8400C] px-5 text-xs font-semibold tracking-[0.12em] uppercase text-white hover:bg-[#c73508] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
const alertDeleteBtnClass =
  "inline-flex h-9 items-center justify-center rounded-sm bg-red-500 px-5 text-xs font-semibold tracking-[0.12em] uppercase text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

export function ProductsTableClient(props: {
  styles: ProductStyleListRow[]
  categories: Array<Pick<CategoryRow, "category_id" | "name">>
  seasons: Array<Pick<SeasonRow, "season_id" | "name">>
}) {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<"active" | "archived">("active")
  const [filters, setFilters] = React.useState<{ search: string; category: string; season: string }>(
    { search: "", category: "all", season: "all" }
  )
  const [archivingId, setArchivingId] = React.useState<string | null>(null)
  const [restoringId, setRestoringId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [discountStyle, setDiscountStyle] = React.useState<{ styleId: string; name: string; currentPercent: number; endsAt?: string | null } | null>(null)
  const [discountInput, setDiscountInput] = React.useState("")
  const [discountEndsAtInput, setDiscountEndsAtInput] = React.useState("")
  const [bulkDiscountOpen, setBulkDiscountOpen] = React.useState(false)
  const [bulkDiscountPercent, setBulkDiscountPercent] = React.useState("")
  const [bulkDiscountEndsAt, setBulkDiscountEndsAt] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const selectedCount = selectedIds.size
  const toggleSelection = (styleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(styleId)) next.delete(styleId)
      else next.add(styleId)
      return next
    })
  }
  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((s) => s.style_id)))
  }
  const clearSelection = () => setSelectedIds(new Set())

  const activeStyles = React.useMemo(
    () => props.styles.filter((s) => !s.archived),
    [props.styles]
  )
  const archivedStyles = React.useMemo(
    () => props.styles.filter((s) => s.archived),
    [props.styles]
  )
  const currentList = viewMode === "active" ? activeStyles : archivedStyles

  const filtered = React.useMemo(() => {
    const q = (filters.search ?? "").trim().toLowerCase()
    return currentList.filter((s) => {
      const matchesName = !q || s.name.toLowerCase().includes(q)
      const matchesCategory = filters.category === "all" || s.category_id === filters.category
      const matchesSeason = filters.season === "all" || s.season_id === filters.season
      return matchesName && matchesCategory && matchesSeason
    })
  }, [currentList, filters])

  const hasProducts = props.styles.length > 0

  // DS v3 dialog input class
  const dialogInputClass =
    "bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] w-full"

  return (
    <div className="w-full">
      {/* Single-style discount dialog */}
      <Dialog open={!!discountStyle} onOpenChange={(open) => !open && setDiscountStyle(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border text-card-foreground rounded-sm p-0 gap-0">
          <DialogHeader className="px-6 py-5 border-b border-border">
            <DialogTitle className="font-sans text-lg font-bold text-foreground">Set Discount</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {discountStyle ? `Apply a discount to "${discountStyle.name}". This affects all variants at POS and in listings.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 py-5">
            <div className="grid gap-2">
              <Label htmlFor="discount-percent" className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Discount % (0–100)</Label>
              <input
                id="discount-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0"
                className={dialogInputClass}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="discount-ends-at" className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Ends on (optional)</Label>
              <input
                id="discount-ends-at"
                type="date"
                value={discountEndsAtInput}
                onChange={(e) => setDiscountEndsAtInput(e.target.value)}
                className={dialogInputClass}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no end date.</p>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end px-6 pb-5">
            <button
              type="button"
              className={alertCancelBtnClass}
              onClick={() => {
                setDiscountStyle(null)
                setDiscountInput("")
                setDiscountEndsAtInput("")
              }}
            >
              Cancel
            </button>
            {discountStyle && discountStyle.currentPercent > 0 && (
              <button
                type="button"
                className={alertCancelBtnClass}
                disabled={isPending}
                onClick={() => {
                  if (!discountStyle) return
                  setError(null)
                  startTransition(async () => {
                    try {
                      await applyStyleDiscount(discountStyle.styleId, 0, null)
                      router.refresh()
                      setDiscountStyle(null)
                      setDiscountInput("")
                      setDiscountEndsAtInput("")
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to clear discount.")
                    }
                  })
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className={alertConfirmBtnClass}
              disabled={isPending}
              onClick={() => {
                if (!discountStyle) return
                const num = parseInt(discountInput, 10)
                if (!Number.isFinite(num) || num < 0 || num > 100) {
                  setError("Enter a number between 0 and 100.")
                  return
                }
                const endsAt = discountEndsAtInput.trim() ? `${discountEndsAtInput.trim()}T23:59:59.000Z` : null
                setError(null)
                startTransition(async () => {
                  try {
                    await applyStyleDiscount(discountStyle.styleId, num, endsAt)
                    router.refresh()
                    setDiscountStyle(null)
                    setDiscountInput("")
                    setDiscountEndsAtInput("")
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to apply discount.")
                  }
                })
              }}
            >
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk discount dialog */}
      <Dialog open={bulkDiscountOpen} onOpenChange={setBulkDiscountOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border text-card-foreground rounded-sm p-0 gap-0">
          <DialogHeader className="px-6 py-5 border-b border-border">
            <DialogTitle className="font-sans text-lg font-bold text-foreground">Bulk Discount</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Apply the same discount to {selectedCount} selected style{selectedCount !== 1 ? "s" : ""}. Affects all variants at POS and in listings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 py-5">
            <div className="grid gap-2">
              <Label htmlFor="bulk-discount-percent" className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Discount % (0–100)</Label>
              <input
                id="bulk-discount-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={bulkDiscountPercent}
                onChange={(e) => setBulkDiscountPercent(e.target.value)}
                placeholder="0"
                className={dialogInputClass}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-discount-ends-at" className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Ends on (optional)</Label>
              <input
                id="bulk-discount-ends-at"
                type="date"
                value={bulkDiscountEndsAt}
                onChange={(e) => setBulkDiscountEndsAt(e.target.value)}
                className={dialogInputClass}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no end date.</p>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end px-6 pb-5">
            <button type="button" className={alertCancelBtnClass} onClick={() => setBulkDiscountOpen(false)}>Cancel</button>
            <button
              type="button"
              className={alertConfirmBtnClass}
              disabled={isPending}
              onClick={() => {
                const num = parseInt(bulkDiscountPercent, 10)
                if (!Number.isFinite(num) || num < 0 || num > 100) {
                  setError("Enter a number between 0 and 100.")
                  return
                }
                const endsAt = bulkDiscountEndsAt.trim() ? `${bulkDiscountEndsAt.trim()}T23:59:59.000Z` : null
                setError(null)
                startTransition(async () => {
                  try {
                    await applyBulkStyleDiscount(Array.from(selectedIds), num, endsAt)
                    router.refresh()
                    setBulkDiscountOpen(false)
                    setBulkDiscountPercent("")
                    setBulkDiscountEndsAt("")
                    setSelectedIds(new Set())
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to apply bulk discount.")
                  }
                })
              }}
            >
              Apply to {selectedCount} styles
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk selection bar */}
      {selectedCount > 0 && viewMode === "active" && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} style{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={alertCancelBtnClass}
              onClick={clearSelection}
            >
              Clear
            </button>
            <button
              type="button"
              className={alertConfirmBtnClass}
              onClick={() => setBulkDiscountOpen(true)}
            >
              Bulk Discount
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <ProductsFilters
            categories={props.categories}
            seasons={props.seasons}
            onFilterChange={setFilters}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
          {error ? (
            <div className="text-sm text-red-400">{error}</div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {viewMode === "active"
                  ? `${filtered.length} ${filtered.length === 1 ? "style" : "styles"}`
                  : `${filtered.length} archived`}
              </span>
              {archivedStyles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "archived" ? "active" : "archived")}
                  className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  {viewMode === "archived" ? "← Active" : `Archived (${archivedStyles.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!hasProducts ? (
        <div className="rounded-sm border border-dashed border-border bg-card/50 p-10 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <p className="text-lg font-semibold text-foreground">No products yet.</p>
            <p className="text-sm text-muted-foreground">Add your first style to get started.</p>
            <div className="pt-2">
              <Link
                href="/products/new"
                className="inline-flex items-center justify-center bg-[#E8400C] text-white hover:bg-[#c73508] rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
              >
                Add New Style
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: Table View */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-border bg-muted/40">
                  <tr>
                    {viewMode === "active" && (
                      <th className="px-4 py-3 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
                        <Checkbox
                          checked={filtered.length > 0 && filtered.every((s) => selectedIds.has(s.style_id))}
                          onCheckedChange={(checked) => (checked ? selectAllFiltered() : clearSelection())}
                          aria-label="Select all"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Image</th>
                    <th className="px-4 py-3 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Style Name</th>
                    <th className="px-4 py-3 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Season</th>
                    <th className="px-4 py-3 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Base Price</th>
                    <th className="hidden px-4 py-3 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground lg:table-cell">Cost</th>
                    <th className="hidden px-4 py-3 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground lg:table-cell">Margin %</th>
                    <th className="px-4 py-3 text-right align-middle text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-border/40">
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-muted-foreground" colSpan={viewMode === "active" ? 9 : 8}>
                        {viewMode === "archived"
                          ? "No archived styles match your filters."
                          : "No styles match your filters."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => {
                      const base = Number(s.base_price ?? 0)
                      const cost = Number(s.cost ?? 0)
                      const discountPct = s.discount_percent ?? 0
                      const active = isDiscountActive(s.discount_percent, s.discount_ends_at)
                      const displayPrice = effectivePrice(base, s.discount_percent, s.discount_ends_at)
                      const margin = marginPercent(displayPrice, cost)
                      const categoryName = s.categories?.name ?? "—"
                      const seasonName = s.seasons?.name

                      return (
                        <tr
                          key={s.style_id}
                          className="group transition-colors duration-100 hover:bg-accent/40"
                        >
                          {viewMode === "active" && (
                            <td className="px-4 py-3.5">
                              <Checkbox
                                checked={selectedIds.has(s.style_id)}
                                onCheckedChange={() => toggleSelection(s.style_id)}
                                aria-label={`Select ${s.name}`}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3.5">
                            <div className="h-10 w-10 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                              {s.image_url && s.image_url !== "/placeholder-product.png" ? (
                                <Image
                                  src={s.image_url}
                                  alt={s.name}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover rounded-md"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/products/${s.style_id}`} className="text-sm font-semibold text-foreground hover:text-[#E8400C] transition-colors">
                              {s.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">{categoryName}</td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {seasonName ?? <span className="text-muted-foreground/50">—</span>}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-foreground tabular-nums font-mono">
                            {active ? (
                              <span className="flex flex-col items-end gap-0.5">
                                <span className="text-[0.65rem] text-muted-foreground line-through">{formatKes(base)}</span>
                                <span>{formatKes(displayPrice)}</span>
                                <span className="text-[0.65rem] font-normal text-emerald-500">{discountPct}% off</span>
                                {s.discount_ends_at && (
                                  <span className="text-[0.65rem] font-normal text-muted-foreground">Until {formatEndsAt(s.discount_ends_at)}</span>
                                )}
                              </span>
                            ) : (
                              formatKes(base)
                            )}
                          </td>
                          <td className="hidden px-4 py-3.5 text-right font-semibold text-foreground tabular-nums font-mono lg:table-cell">
                            {formatKes(cost)}
                          </td>
                          <td className="hidden px-4 py-3.5 text-right lg:table-cell">
                            <span className={marginBadgeClass(margin)}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {viewMode === "active" ? (
                                <>
                                  <Link
                                    href={`/products/${s.style_id}/edit`}
                                    className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Link>

                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm h-7 w-7 flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Discount"
                                    disabled={isPending}
                                    onClick={() => {
                                      setDiscountStyle({ styleId: s.style_id, name: s.name, currentPercent: discountPct, endsAt: s.discount_ends_at })
                                      setDiscountInput(String(discountPct))
                                      setDiscountEndsAtInput(s.discount_ends_at ? new Date(s.discount_ends_at).toISOString().slice(0, 10) : "")
                                    }}
                                  >
                                    <Percent className="h-4 w-4" />
                                  </button>

                                  <AlertDialog.Root
                                    open={archivingId === s.style_id}
                                    onOpenChange={(open) => setArchivingId(open ? s.style_id : null)}
                                  >
                                    <AlertDialog.Trigger asChild>
                                      <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm h-7 w-7 flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                        title="Archive"
                                        disabled={isPending}
                                      >
                                        <Archive className="h-4 w-4" />
                                      </button>
                                    </AlertDialog.Trigger>

                                    <AlertDialog.Portal>
                                      <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
                                      <AlertDialog.Content className={alertContentClass}>
                                        <AlertDialog.Title className="font-sans text-lg font-bold text-foreground mb-2">
                                          Archive this style?
                                        </AlertDialog.Title>
                                        <AlertDialog.Description className="text-sm text-muted-foreground mb-6">
                                          This will hide the style from your active list. You can restore it anytime from Archived.
                                        </AlertDialog.Description>

                                        <div className="flex items-center justify-end gap-2">
                                          <AlertDialog.Cancel asChild>
                                            <button type="button" className={alertCancelBtnClass} disabled={isPending}>Cancel</button>
                                          </AlertDialog.Cancel>

                                          <AlertDialog.Action asChild>
                                            <button
                                              type="button"
                                              className={alertConfirmBtnClass}
                                              disabled={isPending}
                                              onClick={() => {
                                                setError(null)
                                                startTransition(async () => {
                                                  try {
                                                    await archiveProductStyle(s.style_id)
                                                    router.refresh()
                                                  } catch (e) {
                                                    setError(e instanceof Error ? e.message : "Failed to archive.")
                                                  } finally {
                                                    setArchivingId(null)
                                                  }
                                                })
                                              }}
                                            >
                                              {isPending ? "Archiving..." : "Archive"}
                                            </button>
                                          </AlertDialog.Action>
                                        </div>
                                      </AlertDialog.Content>
                                    </AlertDialog.Portal>
                                  </AlertDialog.Root>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm h-7 w-7 flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Restore to active"
                                  disabled={isPending}
                                  onClick={() => {
                                    setError(null)
                                    startTransition(async () => {
                                      try {
                                        setRestoringId(s.style_id)
                                        await unarchiveProductStyle(s.style_id)
                                        setViewMode("active")
                                        router.refresh()
                                      } catch (e) {
                                        setError(e instanceof Error ? e.message : "Failed to restore.")
                                      } finally {
                                        setRestoringId(null)
                                      }
                                    })
                                  }}
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                </button>
                              )}

                              <AlertDialog.Root
                                open={deletingId === s.style_id}
                                onOpenChange={(open) => setDeletingId(open ? s.style_id : null)}
                              >
                                <AlertDialog.Trigger asChild>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-sm h-7 w-7 flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Delete permanently"
                                    disabled={isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </AlertDialog.Trigger>

                                <AlertDialog.Portal>
                                  <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
                                  <AlertDialog.Content className={alertContentClass}>
                                    <AlertDialog.Title className="font-sans text-lg font-bold text-foreground mb-2">
                                      Delete &quot;{s.name}&quot; permanently?
                                    </AlertDialog.Title>
                                    <AlertDialog.Description className="text-sm text-muted-foreground mb-6">
                                      This will remove the style and all its variants and inventory levels. This cannot be undone. Products with sales history cannot be deleted—use Archive instead.
                                    </AlertDialog.Description>

                                    <div className="flex items-center justify-end gap-2">
                                      <AlertDialog.Cancel asChild>
                                        <button type="button" className={alertCancelBtnClass} disabled={isPending}>Cancel</button>
                                      </AlertDialog.Cancel>

                                      <AlertDialog.Action asChild>
                                        <button
                                          type="button"
                                          className={alertDeleteBtnClass}
                                          disabled={isPending}
                                          onClick={() => {
                                            setError(null)
                                            startTransition(async () => {
                                              try {
                                                await deleteProductStyle(s.style_id)
                                                setDeletingId(null)
                                                router.push("/products")
                                                router.refresh()
                                              } catch (e) {
                                                setError(e instanceof Error ? e.message : "Failed to delete.")
                                              } finally {
                                                setDeletingId(null)
                                              }
                                            })
                                          }}
                                        >
                                          {isPending ? "Deleting..." : "Delete"}
                                        </button>
                                      </AlertDialog.Action>
                                    </div>
                                  </AlertDialog.Content>
                                </AlertDialog.Portal>
                              </AlertDialog.Root>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: Card View */}
          <div className="md:hidden">
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="rounded-sm border border-dashed border-border bg-card/50 p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {viewMode === "archived"
                      ? "No archived styles match your filters."
                      : "No styles match your filters."}
                  </p>
                </div>
              ) : (
                filtered.map((s) => {
                  const base = Number(s.base_price ?? 0)
                  const cost = Number(s.cost ?? 0)
                  const discountPct = s.discount_percent ?? 0
                  const active = isDiscountActive(s.discount_percent, s.discount_ends_at)
                  const displayPrice = effectivePrice(base, s.discount_percent, s.discount_ends_at)
                  const margin = marginPercent(displayPrice, cost)
                  const categoryName = s.categories?.name ?? "—"
                  const seasonName = s.seasons?.name ?? "—"

                  return viewMode === "active" ? (
                    <Link
                      key={s.style_id}
                      href={`/products/${s.style_id}`}
                      className="block rounded-sm border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40"
                    >
                      <div className="flex gap-4">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                          {s.image_url && s.image_url !== "/placeholder-product.png" ? (
                            <Image
                              src={s.image_url}
                              alt={s.name}
                              width={64}
                              height={64}
                              className="h-16 w-16 object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            <div>{categoryName} · {seasonName}</div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="font-semibold text-foreground font-mono tabular-nums">
                                {active ? (
                                  <>
                                    <span className="text-muted-foreground line-through mr-1">{formatKes(base)}</span>
                                    {formatKes(displayPrice)}
                                  </>
                                ) : (
                                  formatKes(base)
                                )}
                              </span>
                              <span className={marginBadgeClass(margin)}>
                                {margin.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Checkbox
                            checked={selectedIds.has(s.style_id)}
                            onCheckedChange={() => toggleSelection(s.style_id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${s.name}`}
                          />
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div key={s.style_id} className="block rounded-sm border border-border bg-card p-4">
                      <div className="flex gap-4">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                          {s.image_url && s.image_url !== "/placeholder-product.png" ? (
                            <Image
                              src={s.image_url}
                              alt={s.name}
                              width={64}
                              height={64}
                              className="h-16 w-16 object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                          <div className="mt-1 text-xs text-muted-foreground">{categoryName} · {seasonName}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-semibold text-foreground font-mono tabular-nums text-xs">{formatKes(base)}</span>
                            <span className={marginBadgeClass(margin)}>{margin.toFixed(1)}%</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                            title="Restore to active"
                            disabled={isPending}
                            onClick={() => {
                              setError(null)
                              startTransition(async () => {
                                try {
                                  setRestoringId(s.style_id)
                                  await unarchiveProductStyle(s.style_id)
                                  setViewMode("active")
                                  router.refresh()
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Failed to restore.")
                                } finally {
                                  setRestoringId(null)
                                }
                              })
                            }}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                          <AlertDialog.Root
                            open={deletingId === s.style_id}
                            onOpenChange={(open) => setDeletingId(open ? s.style_id : null)}
                          >
                            <AlertDialog.Trigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                                title="Delete permanently"
                                disabled={isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialog.Trigger>

                            <AlertDialog.Portal>
                              <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
                              <AlertDialog.Content className={alertContentClass}>
                                <AlertDialog.Title className="font-sans text-lg font-bold text-foreground mb-2">
                                  Delete &quot;{s.name}&quot; permanently?
                                </AlertDialog.Title>
                                <AlertDialog.Description className="text-sm text-muted-foreground mb-6">
                                  This will remove the style and all its variants and inventory levels. This cannot be undone.
                                </AlertDialog.Description>

                                <div className="flex items-center justify-end gap-2">
                                  <AlertDialog.Cancel asChild>
                                    <button type="button" className={alertCancelBtnClass} disabled={isPending}>Cancel</button>
                                  </AlertDialog.Cancel>

                                  <AlertDialog.Action asChild>
                                    <button
                                      type="button"
                                      className={alertDeleteBtnClass}
                                      disabled={isPending}
                                      onClick={() => {
                                        setError(null)
                                        startTransition(async () => {
                                          try {
                                            await deleteProductStyle(s.style_id)
                                            setDeletingId(null)
                                            router.push("/products")
                                            router.refresh()
                                          } catch (e) {
                                            setError(e instanceof Error ? e.message : "Failed to delete.")
                                          } finally {
                                            setDeletingId(null)
                                          }
                                        })
                                      }}
                                    >
                                      {isPending ? "Deleting..." : "Delete"}
                                    </button>
                                  </AlertDialog.Action>
                                </div>
                              </AlertDialog.Content>
                            </AlertDialog.Portal>
                          </AlertDialog.Root>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Suppress unused variable warning */}
      {restoringId && null}
    </div>
  )
}
