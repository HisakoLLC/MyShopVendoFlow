"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import { Archive, ArchiveRestore, Pencil, Percent, Trash2 } from "lucide-react"
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

  return (
    <div className="w-full">
      {/* Single-style discount dialog */}
      <Dialog open={!!discountStyle} onOpenChange={(open) => !open && setDiscountStyle(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set discount</DialogTitle>
            <DialogDescription>
              {discountStyle ? `Apply a discount to "${discountStyle.name}". This affects all variants at POS and in listings.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="discount-percent">Discount % (0–100)</Label>
              <Input
                id="discount-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="discount-ends-at">Ends on (optional)</Label>
              <Input
                id="discount-ends-at"
                type="date"
                value={discountEndsAtInput}
                onChange={(e) => setDiscountEndsAtInput(e.target.value)}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Leave empty for no end date.</p>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDiscountStyle(null)
                setDiscountInput("")
                setDiscountEndsAtInput("")
              }}
            >
              Cancel
            </Button>
            {discountStyle && discountStyle.currentPercent > 0 && (
              <Button
                variant="outline"
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
                Clear discount
              </Button>
            )}
            <Button
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk discount dialog */}
      <Dialog open={bulkDiscountOpen} onOpenChange={setBulkDiscountOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk discount</DialogTitle>
            <DialogDescription>
              Apply the same discount to {selectedCount} selected style{selectedCount !== 1 ? "s" : ""}. Affects all variants at POS and in listings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="bulk-discount-percent">Discount % (0–100)</Label>
              <Input
                id="bulk-discount-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={bulkDiscountPercent}
                onChange={(e) => setBulkDiscountPercent(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-discount-ends-at">Ends on (optional)</Label>
              <Input
                id="bulk-discount-ends-at"
                type="date"
                value={bulkDiscountEndsAt}
                onChange={(e) => setBulkDiscountEndsAt(e.target.value)}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Leave empty for no end date.</p>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setBulkDiscountOpen(false)}>Cancel</Button>
            <Button
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCount > 0 && viewMode === "active" && (
        <div className="-mx-4 mb-4 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-background-card-dark/50">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {selectedCount} style{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
            <Button size="sm" onClick={() => setBulkDiscountOpen(true)}>Bulk discount</Button>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b bg-background-card-light/80 px-4 py-3 backdrop-blur dark:bg-background-card-dark/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <ProductsFilters
              categories={props.categories}
              seasons={props.seasons}
              onFilterChange={setFilters}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
            {error ? (
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span>
                  {viewMode === "active"
                    ? `${filtered.length} ${filtered.length === 1 ? "style" : "styles"}`
                    : `${filtered.length} archived`}
                </span>
                {archivedStyles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === "archived" ? "active" : "archived")}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    {viewMode === "archived" ? "Active" : `Archived (${archivedStyles.length})`}
                  </button>
                )}
              </div>
            )}

            {viewMode === "active" && (
              <Link
                href="/products/new"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-primary dark:text-primary-foreground dark:hover:opacity-90"
              >
                Add New Style
              </Link>
            )}
          </div>
        </div>
      </div>

      {!hasProducts ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-background p-10 text-center dark:border-zinc-800 dark:bg-background">
          <div className="mx-auto max-w-md space-y-3">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              No products yet.
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Add your first style to get started.
            </p>
            <div className="pt-2">
              <Link
                href="/products/new"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-primary dark:text-primary-foreground dark:hover:opacity-90"
              >
                Add New Style
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: Table View */}
          <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-background-card-light shadow-sm dark:border-border-dark dark:bg-background-card-dark md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-background/40 dark:text-zinc-400">
                <tr>
                  {viewMode === "active" && (
                    <th className="w-10 px-2 py-3">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every((s) => selectedIds.has(s.style_id))}
                        onCheckedChange={(checked) => (checked ? selectAllFiltered() : clearSelection())}
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Style Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Season</th>
                  <th className="px-4 py-3 text-right">Base Price</th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell">Cost</th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell">Margin %</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm dark:divide-zinc-900">
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400" colSpan={viewMode === "active" ? 9 : 8}>
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
                    const seasonName = s.seasons?.name ?? "—"

                    return (
                      <tr
                        key={s.style_id}
                        className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                      >
                        {viewMode === "active" && (
                          <td className="w-10 px-2 py-3">
                            <Checkbox
                              checked={selectedIds.has(s.style_id)}
                              onCheckedChange={() => toggleSelection(s.style_id)}
                              aria-label={`Select ${s.name}`}
                            />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="h-[60px] w-[60px] overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-background-card-dark dark:ring-border-dark">
                            {s.image_url ? (
                              <Image
                                src={s.image_url}
                                alt={s.name}
                                width={60}
                                height={60}
                                className="h-[60px] w-[60px] object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                                No image
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{s.name}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{categoryName}</td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{seasonName}</td>
                        <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                          {active ? (
                            <span className="flex flex-col items-end gap-0.5">
                              <span className="text-zinc-500 line-through">{formatKes(base)}</span>
                              <span>{formatKes(displayPrice)}</span>
                              <span className="text-xs font-normal text-green-600 dark:text-green-400">{discountPct}% off</span>
                              {s.discount_ends_at && (
                                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Until {formatEndsAt(s.discount_ends_at)}</span>
                              )}
                            </span>
                          ) : (
                            formatKes(base)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                          {formatKes(cost)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-background-card-dark dark:text-text-secondary-dark">
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {viewMode === "active" ? (
                              <>
                                <Link
                                  href={`/products/${s.style_id}/edit`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>

                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
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
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                                      title="Archive"
                                      disabled={isPending}
                                    >
                                      <Archive className="h-4 w-4" />
                                    </button>
                                  </AlertDialog.Trigger>

                                  <AlertDialog.Portal>
                                    <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                                    <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-background-card-light p-5 shadow-lg outline-none dark:border-border-dark dark:bg-background-card-dark">
                                      <AlertDialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                        Archive this style?
                                      </AlertDialog.Title>
                                      <AlertDialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        This will hide the style from your active list. You can restore it anytime from Archived.
                                      </AlertDialog.Description>

                                      <div className="mt-4 flex items-center justify-end gap-2">
                                        <AlertDialog.Cancel asChild>
                                          <button
                                            type="button"
                                            className="inline-flex h-10 items-center justify-center rounded-lg border border-border-light bg-background-card-light px-4 dark:border-border-dark dark:bg-background-card-dark text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-background dark:text-zinc-100 dark:hover:bg-zinc-900"
                                            disabled={isPending}
                                          >
                                            Cancel
                                          </button>
                                        </AlertDialog.Cancel>

                                        <AlertDialog.Action asChild>
                                          <button
                                            type="button"
                                            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:text-primary-foreground dark:hover:opacity-90"
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
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-950/30 dark:hover:text-green-300"
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
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                                  title="Delete permanently"
                                  disabled={isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </AlertDialog.Trigger>

                              <AlertDialog.Portal>
                                <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-background-card-light p-5 shadow-lg outline-none dark:border-border-dark dark:bg-background-card-dark">
                                  <AlertDialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Delete &quot;{s.name}&quot; permanently?
                                  </AlertDialog.Title>
                                  <AlertDialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    This will remove the style and all its variants and inventory levels. This cannot be undone. Products with sales history cannot be deleted—use Archive instead.
                                  </AlertDialog.Description>

                                  <div className="mt-4 flex items-center justify-end gap-2">
                                    <AlertDialog.Cancel asChild>
                                      <button
                                        type="button"
                                        className="inline-flex h-10 items-center justify-center rounded-lg border border-border-light bg-background-card-light px-4 dark:border-border-dark dark:bg-background-card-dark text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-background dark:text-zinc-100 dark:hover:bg-zinc-900"
                                        disabled={isPending}
                                      >
                                        Cancel
                                      </button>
                                    </AlertDialog.Cancel>

                                    <AlertDialog.Action asChild>
                                      <button
                                        type="button"
                                        className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                                        disabled={isPending}
                                        onClick={() => {
                                          setError(null)
                                          startTransition(async () => {
                                            try {
                                              await deleteProductStyle(s.style_id)
                                              setDeletingId(null)
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
                <div className="rounded-xl border border-dashed border-zinc-200 bg-background p-10 text-center dark:border-zinc-800 dark:bg-background">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                  const cardClassName =
                    "block rounded-lg border border-border-light bg-background-card-light p-4 dark:border-border-dark dark:bg-background-card-dark transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-background dark:hover:border-zinc-700 dark:hover:bg-zinc-800"

                  return viewMode === "active" ? (
                    <Link
                      key={s.style_id}
                      href={`/products/${s.style_id}/edit`}
                      className={cardClassName}
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-background-card-dark dark:ring-border-dark">
                          {s.image_url ? (
                            <Image
                              src={s.image_url}
                              alt={s.name}
                              width={80}
                              height={80}
                              className="h-20 w-20 object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                              No image
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                            {s.name}
                          </h3>
                          <div className="mt-1 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Category:</span>
                              <span>{categoryName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Season:</span>
                              <span>{seasonName}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {active ? (
                                  <>
                                    <span className="text-zinc-500 line-through">{formatKes(base)}</span>{" "}
                                    {formatKes(displayPrice)} <span className="text-xs text-green-600 dark:text-green-400">{discountPct}% off</span>
                                    {s.discount_ends_at && (
                                      <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">Until {formatEndsAt(s.discount_ends_at)}</span>
                                    )}
                                  </>
                                ) : (
                                  formatKes(base)
                                )}
                              </span>
                              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                {margin.toFixed(1)}% margin
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2">
                          {viewMode === "active" ? (
                            <>
                            <div className="flex items-center gap-1">
                              <Checkbox
                                checked={selectedIds.has(s.style_id)}
                                onCheckedChange={() => toggleSelection(s.style_id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select ${s.name}`}
                              />
                            </div>
                            <Link
                              href={`/products/${s.style_id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDiscountStyle({ styleId: s.style_id, name: s.name, currentPercent: discountPct, endsAt: s.discount_ends_at })
                                setDiscountInput(String(discountPct))
                                setDiscountEndsAtInput(s.discount_ends_at ? new Date(s.discount_ends_at).toISOString().slice(0, 10) : "")
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                              title="Discount"
                            >
                              <Percent className="h-4 w-4" />
                            </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950/30 dark:hover:text-green-300"
                              title="Restore to active"
                              disabled={isPending}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
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
                          )}
                          <AlertDialog.Root
                            open={deletingId === s.style_id}
                            onOpenChange={(open) => setDeletingId(open ? s.style_id : null)}
                          >
                            <AlertDialog.Trigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                                title="Delete permanently"
                                disabled={isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialog.Trigger>

                            <AlertDialog.Portal>
                              <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                              <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-background-card-light p-5 shadow-lg outline-none dark:border-border-dark dark:bg-background-card-dark">
                                <AlertDialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                  Delete &quot;{s.name}&quot; permanently?
                                </AlertDialog.Title>
                                <AlertDialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                  This will remove the style and all its variants and inventory levels. This cannot be undone.
                                </AlertDialog.Description>

                                <div className="mt-4 flex items-center justify-end gap-2">
                                  <AlertDialog.Cancel asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-10 items-center justify-center rounded-lg border border-border-light bg-background-card-light px-4 dark:border-border-dark dark:bg-background-card-dark text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-background dark:text-zinc-100 dark:hover:bg-zinc-900"
                                      disabled={isPending}
                                    >
                                      Cancel
                                    </button>
                                  </AlertDialog.Cancel>

                                  <AlertDialog.Action asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                                      disabled={isPending}
                                      onClick={() => {
                                        setError(null)
                                        startTransition(async () => {
                                          try {
                                            await deleteProductStyle(s.style_id)
                                            setDeletingId(null)
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
                    </Link>
                  ) : (
                    <div key={s.style_id} className={cardClassName}>
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-background-card-dark dark:ring-border-dark">
                          {s.image_url ? (
                            <Image
                              src={s.image_url}
                              alt={s.name}
                              width={80}
                              height={80}
                              className="h-20 w-20 object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                              No image
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                            {s.name}
                          </h3>
                          <div className="mt-1 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Category:</span>
                              <span>{categoryName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Season:</span>
                              <span>{seasonName}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {active ? (
                                  <>
                                    <span className="text-zinc-500 line-through">{formatKes(base)}</span>{" "}
                                    {formatKes(displayPrice)} <span className="text-xs text-green-600 dark:text-green-400">{discountPct}% off</span>
                                    {s.discount_ends_at && (
                                      <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">Until {formatEndsAt(s.discount_ends_at)}</span>
                                    )}
                                  </>
                                ) : (
                                  formatKes(base)
                                )}
                              </span>
                              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                {margin.toFixed(1)}% margin
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions - archived: Restore + Delete */}
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950/30 dark:hover:text-green-300"
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
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                                title="Delete permanently"
                                disabled={isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialog.Trigger>

                            <AlertDialog.Portal>
                              <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                              <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-background-card-light p-5 shadow-lg outline-none dark:border-border-dark dark:bg-background-card-dark">
                                <AlertDialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                  Delete &quot;{s.name}&quot; permanently?
                                </AlertDialog.Title>
                                <AlertDialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                  This will remove the style and all its variants and inventory levels. This cannot be undone.
                                </AlertDialog.Description>

                                <div className="mt-4 flex items-center justify-end gap-2">
                                  <AlertDialog.Cancel asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-10 items-center justify-center rounded-lg border border-border-light bg-background-card-light px-4 dark:border-border-dark dark:bg-background-card-dark text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-background dark:text-zinc-100 dark:hover:bg-zinc-900"
                                      disabled={isPending}
                                    >
                                      Cancel
                                    </button>
                                  </AlertDialog.Cancel>

                                  <AlertDialog.Action asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                                      disabled={isPending}
                                      onClick={() => {
                                        setError(null)
                                        startTransition(async () => {
                                          try {
                                            await deleteProductStyle(s.style_id)
                                            setDeletingId(null)
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
    </div>
  )
}

