"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import {
  Archive,
  Pencil,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

import type { Tables } from "@/types/database"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { archiveProductStyle } from "./actions"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format-currency"

type CategoryRow = Tables<"categories">
type SeasonRow = Tables<"seasons">

export type ProductStyleListRow = Pick<
  Tables<"product_styles">,
  "style_id" | "name" | "base_price" | "cost" | "image_url" | "category_id" | "season_id"
> & {
  categories?: Pick<CategoryRow, "name"> | null
  seasons?: Pick<SeasonRow, "name"> | null
  variant_count?: number
}

function marginPercent(basePrice: number, cost: number) {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0
  return ((basePrice - cost) / basePrice) * 100
}

type SortKey = "name" | "base_price" | "margin"
type SortDir = "asc" | "desc"

const PER_PAGE_OPTIONS = [25, 50, 100]

export function ProductsTableClient(props: {
  styles: ProductStyleListRow[]
  categories: Array<Pick<CategoryRow, "category_id" | "name">>
  seasons: Array<Pick<SeasonRow, "season_id" | "name">>
}) {
  const [filters, setFilters] = React.useState({
    search: "",
    category: "all",
    season: "all",
  })
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey>("name")
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(25)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [archivingId, setArchivingId] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  // Debounce search 300ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch((filters.search ?? "").trim()), 300)
    return () => clearTimeout(t)
  }, [filters.search])

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    return props.styles.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q)
      const matchesCategory = filters.category === "all" || s.category_id === filters.category
      const matchesSeason = filters.season === "all" || s.season_id === filters.season
      return matchesSearch && matchesCategory && matchesSeason
    })
  }, [props.styles, debouncedSearch, filters.category, filters.season])

  const sorted = React.useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const baseA = Number(a.base_price ?? 0)
      const costA = Number(a.cost ?? 0)
      const baseB = Number(b.base_price ?? 0)
      const costB = Number(b.cost ?? 0)
      const marginA = marginPercent(baseA, costA)
      const marginB = marginPercent(baseB, costB)
      let cmp = 0
      if (sortKey === "name") {
        cmp = (a.name ?? "").localeCompare(b.name ?? "")
      } else if (sortKey === "base_price") {
        cmp = baseA - baseB
      } else {
        cmp = marginA - marginB
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const start = (page - 1) * perPage
  const paginated = sorted.slice(start, start + perPage)

  const hasActiveFilters =
    debouncedSearch !== "" || filters.category !== "all" || filters.season !== "all"

  const handleClearFilters = () => {
    setFilters({ search: "", category: "all", season: "all" })
    setDebouncedSearch("")
    setPage(1)
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map((s) => s.style_id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasProducts = props.styles.length > 0

  return (
    <div className="w-full space-y-6">
      {/* Filters bar — sticky, bg-slate-50, rounded-xl */}
      <div className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full lg:w-1/2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={filters.search ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search by product name or SKU..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-primary-500"
              />
            </div>
          </div>
          <div className="w-[200px]">
            <Select
              value={filters.category}
              onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger className="h-11 w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {props.categories.map((c) => (
                  <SelectItem key={c.category_id} value={c.category_id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <Select
              value={filters.season}
              onValueChange={(v) => setFilters((f) => ({ ...f, season: v }))}
            >
              <SelectTrigger className="h-11 w-[200px]">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {props.seasons.map((s) => (
                  <SelectItem key={s.season_id} value={s.season_id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {!hasProducts ? null : (
        <>
          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 rounded-xl border-l-4 border-primary-600 bg-primary-50 px-4 py-3 dark:bg-primary-950/30">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Desktop: Table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                    <th className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && selectedIds.size === paginated.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => toggleSort("name")}
                        className="inline-flex items-center gap-1 transition hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        Product Name
                        {sortKey === "name" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : null}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Season
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => toggleSort("base_price")}
                        className="inline-flex items-center gap-1 transition hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        Base Price
                        {sortKey === "base_price" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : null}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Cost
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => toggleSort("margin")}
                        className="inline-flex items-center gap-1 transition hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        Margin %
                        {sortKey === "margin" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : null}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Variants
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        No products match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((s) => {
                      const base = Number(s.base_price ?? 0)
                      const cost = Number(s.cost ?? 0)
                      const margin = marginPercent(base, cost)
                      const categoryName = s.categories?.name ?? "—"
                      const seasonName = s.seasons?.name ?? "—"
                      const variantCount = s.variant_count ?? 0
                      const marginHigh = margin >= 40
                      const marginMid = margin >= 25 && margin < 40
                      const marginLow = margin < 25

                      return (
                        <tr
                          key={s.style_id}
                          className="border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(s.style_id)}
                              onChange={() => toggleSelect(s.style_id)}
                              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                              aria-label={`Select ${s.name}`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-[60px] w-[60px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition-shadow hover:shadow dark:border-slate-700 dark:bg-slate-800">
                              {s.image_url ? (
                                <Image
                                  src={s.image_url}
                                  alt={s.name}
                                  width={60}
                                  height={60}
                                  className="h-[60px] w-[60px] object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                                  No image
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/products/${s.style_id}/edit`}
                              className="font-medium text-slate-900 transition-colors hover:text-primary-600 dark:text-slate-100 dark:hover:text-primary-400"
                            >
                              {s.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {categoryName}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {seasonName}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(base)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                            {formatCurrency(cost)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                marginHigh &&
                                  "bg-success-500/10 text-success-700 dark:text-success-400",
                                marginMid &&
                                  "bg-warning-500/10 text-warning-700 dark:text-warning-600",
                                marginLow && "bg-danger-500/10 text-danger-700 dark:text-danger-400"
                              )}
                            >
                              {marginHigh && <TrendingUp className="h-3.5 w-3.5" />}
                              {marginLow && margin > 0 && <TrendingDown className="h-3.5 w-3.5" />}
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {variantCount} variant{variantCount === 1 ? "" : "s"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/products/${s.style_id}/edit`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <AlertDialog.Root
                                open={archivingId === s.style_id}
                                onOpenChange={(open) => setArchivingId(open ? s.style_id : null)}
                              >
                                <AlertDialog.Trigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    title="Archive"
                                    disabled={isPending}
                                  >
                                    <Archive className="h-4 w-4" />
                                  </button>
                                </AlertDialog.Trigger>
                                <AlertDialog.Portal>
                                  <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                                  <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-lg outline-none dark:border-slate-800 dark:bg-slate-950">
                                    <AlertDialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                      Archive this product?
                                    </AlertDialog.Title>
                                    <AlertDialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                      This will hide the product from your active list. You can restore it later from archive (if enabled).
                                    </AlertDialog.Description>
                                    <div className="mt-4 flex justify-end gap-2">
                                      <AlertDialog.Cancel asChild>
                                        <button
                                          type="button"
                                          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                          disabled={isPending}
                                        >
                                          Cancel
                                        </button>
                                      </AlertDialog.Cancel>
                                      <AlertDialog.Action asChild>
                                        <button
                                          type="button"
                                          className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                                          disabled={isPending}
                                          onClick={() => {
                                            setError(null)
                                            startTransition(async () => {
                                              try {
                                                await archiveProductStyle(s.style_id)
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
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(start + perPage, sorted.length)} of{" "}
                {sorted.length} products
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={String(perPage)}
                  onValueChange={(v) => {
                    setPerPage(Number(v))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PER_PAGE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} per page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[80px] text-center text-sm text-slate-700 dark:text-slate-300">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Cards */}
          <div className="space-y-4 lg:hidden">
            {paginated.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No products match your filters.
                </p>
              </div>
            ) : (
              paginated.map((s) => {
                const base = Number(s.base_price ?? 0)
                const cost = Number(s.cost ?? 0)
                const margin = marginPercent(base, cost)
                const categoryName = s.categories?.name ?? "—"
                const seasonName = s.seasons?.name ?? "—"
                const variantCount = s.variant_count ?? 0
                const marginHigh = margin >= 40
                const marginMid = margin >= 25 && margin < 40
                const marginLow = margin < 25

                return (
                  <div
                    key={s.style_id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        {s.image_url ? (
                          <Image
                            src={s.image_url}
                            alt={s.name}
                            width={80}
                            height={80}
                            className="h-20 w-20 object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                          {s.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {categoryName}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {seasonName}
                          </span>
                        </div>
                        <p className="mt-2 text-lg font-bold text-primary-600 dark:text-primary-400">
                          {formatCurrency(base)}
                        </p>
                        <span
                          className={cn(
                            "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            marginHigh && "bg-success-500/10 text-success-700 dark:text-success-400",
                            marginMid && "bg-warning-500/10 text-warning-700 dark:text-warning-600",
                            marginLow && "bg-danger-500/10 text-danger-700 dark:text-danger-400"
                          )}
                        >
                          {margin.toFixed(1)}% margin
                        </span>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {variantCount} variant{variantCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <Link
                        href={`/products/${s.style_id}/edit`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                      <AlertDialog.Root
                        open={archivingId === s.style_id}
                        onOpenChange={(open) => setArchivingId(open ? s.style_id : null)}
                      >
                        <AlertDialog.Trigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            disabled={isPending}
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </button>
                        </AlertDialog.Trigger>
                        <AlertDialog.Portal>
                          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-lg outline-none dark:border-slate-800 dark:bg-slate-950">
                            <AlertDialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              Archive this product?
                            </AlertDialog.Title>
                            <AlertDialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                              This will hide the product from your active list.
                            </AlertDialog.Description>
                            <div className="mt-4 flex justify-end gap-2">
                              <AlertDialog.Cancel asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                  disabled={isPending}
                                >
                                  Cancel
                                </button>
                              </AlertDialog.Cancel>
                              <AlertDialog.Action asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                                  disabled={isPending}
                                  onClick={() => {
                                    startTransition(async () => {
                                      try {
                                        await archiveProductStyle(s.style_id)
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
                    </div>
                  </div>
                )
              })
            )}
            {/* Mobile pagination: Prev/Next only */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
    </div>
  )
}
