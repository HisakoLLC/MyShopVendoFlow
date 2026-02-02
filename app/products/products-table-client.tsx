"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import { Archive, Pencil, Trash2 } from "lucide-react"

import type { Tables } from "@/types/database"
import { ProductsFilters } from "@/components/products/ProductsFilters"
import { archiveProductStyle, deleteProductStyle } from "./actions"

type CategoryRow = Tables<"categories">
type SeasonRow = Tables<"seasons">

export type ProductStyleListRow = Pick<
  Tables<"product_styles">,
  "style_id" | "name" | "base_price" | "cost" | "image_url" | "category_id" | "season_id"
> & {
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

export function ProductsTableClient(props: {
  styles: ProductStyleListRow[]
  categories: Array<Pick<CategoryRow, "category_id" | "name">>
  seasons: Array<Pick<SeasonRow, "season_id" | "name">>
}) {
  const [filters, setFilters] = React.useState<{ search: string; category: string; season: string }>(
    { search: "", category: "all", season: "all" }
  )
  const [archivingId, setArchivingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = (filters.search ?? "").trim().toLowerCase()
    return props.styles.filter((s) => {
      const matchesName = !q || s.name.toLowerCase().includes(q)
      const matchesCategory = filters.category === "all" || s.category_id === filters.category
      const matchesSeason = filters.season === "all" || s.season_id === filters.season
      return matchesName && matchesCategory && matchesSeason
    })
  }, [props.styles, filters])

  const hasProducts = props.styles.length > 0

  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b bg-white/80 px-4 py-3 backdrop-blur dark:bg-zinc-950/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <ProductsFilters
              categories={props.categories}
              seasons={props.seasons}
              onFilterChange={setFilters}
            />
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end">
            {error ? (
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            ) : (
              <div className="text-sm text-zinc-500">
                {filtered.length} {filtered.length === 1 ? "style" : "styles"}
              </div>
            )}

            <Link
              href="/products/new"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Add New Style
            </Link>
          </div>
        </div>
      </div>

      {!hasProducts ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
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
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Add New Style
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: Table View */}
          <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/40 dark:text-zinc-400">
                <tr>
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
                    <td className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400" colSpan={6}>
                      No styles match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const base = Number(s.base_price ?? 0)
                    const cost = Number(s.cost ?? 0)
                    const margin = marginPercent(base, cost)
                    const categoryName = s.categories?.name ?? "—"
                    const seasonName = s.seasons?.name ?? "—"

                    return (
                      <tr
                        key={s.style_id}
                        className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                      >
                        <td className="px-4 py-3">
                          <div className="h-[60px] w-[60px] overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
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
                          {formatKes(base)}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                          {formatKes(cost)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/products/${s.style_id}/edit`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
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
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                                  title="Archive"
                                  disabled={isPending}
                                >
                                  <Archive className="h-4 w-4" />
                                </button>
                              </AlertDialog.Trigger>

                              <AlertDialog.Portal>
                                <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-950">
                                  <AlertDialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Archive this style?
                                  </AlertDialog.Title>
                                  <AlertDialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    This will hide the style from your active products list. You can restore it later from an archive view (if enabled).
                                  </AlertDialog.Description>

                                  <div className="mt-4 flex items-center justify-end gap-2">
                                    <AlertDialog.Cancel asChild>
                                      <button
                                        type="button"
                                        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                                        disabled={isPending}
                                      >
                                        Cancel
                                      </button>
                                    </AlertDialog.Cancel>

                                    <AlertDialog.Action asChild>
                                      <button
                                        type="button"
                                        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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
                                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-950">
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
                                        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
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
                <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No styles match your filters.
                  </p>
                </div>
              ) : (
                filtered.map((s) => {
                  const base = Number(s.base_price ?? 0)
                  const cost = Number(s.cost ?? 0)
                  const margin = marginPercent(base, cost)
                  const categoryName = s.categories?.name ?? "—"
                  const seasonName = s.seasons?.name ?? "—"

                  return (
                    <Link
                      key={s.style_id}
                      href={`/products/${s.style_id}/edit`}
                      className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
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
                                {formatKes(base)}
                              </span>
                              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                {margin.toFixed(1)}% margin
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2">
                          <Link
                            href={`/products/${s.style_id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
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
                              <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-950">
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
                                      className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
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

