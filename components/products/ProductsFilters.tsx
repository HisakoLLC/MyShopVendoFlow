"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

type CategoryOption = {
  category_id: string
  name: string
}

type SeasonOption = {
  season_id: string
  name: string
}

type Filters = {
  search: string
  category: string
  season: string
}

type ProductsFiltersProps = {
  categories: CategoryOption[]
  seasons: SeasonOption[]
  onFilterChange: (filters: Filters) => void
}

export function ProductsFilters({ categories, seasons, onFilterChange }: ProductsFiltersProps) {
  const categoryIds = React.useMemo(() => new Set(categories.map((c) => c.category_id)), [categories])
  const seasonIds = React.useMemo(() => new Set(seasons.map((s) => s.season_id)), [seasons])

  const schema = React.useMemo(
    () =>
      z.object({
        search: z.string().max(100, "Search is too long.").default(""),
        category: z
          .string()
          .default("all")
          .refine((v) => v === "all" || categoryIds.has(v), "Invalid category."),
        season: z
          .string()
          .default("all")
          .refine((v) => v === "all" || seasonIds.has(v), "Invalid season."),
      }),
    [categoryIds, seasonIds]
  )

  const form = useForm<Filters>({
    resolver: zodResolver(schema),
    defaultValues: { search: "", category: "all", season: "all" },
    mode: "onChange",
  })

  const search = form.watch("search")
  const category = form.watch("category")
  const season = form.watch("season")

  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  React.useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch((search ?? "").trim()), 300)
    return () => clearTimeout(handle)
  }, [search])

  React.useEffect(() => {
    const parsed = schema.safeParse({ search: debouncedSearch, category, season })
    if (!parsed.success) return
    onFilterChange(parsed.data)
  }, [debouncedSearch, category, season, onFilterChange, schema])

  const hasActiveFilters = Boolean((search ?? "").trim()) || category !== "all" || season !== "all"

  const handleClear = () => {
    form.reset({ search: "", category: "all", season: "all" })
    setDebouncedSearch("")
    onFilterChange({ search: "", category: "all", season: "all" })
  }

  // DS v3.0 input/select classes
  const inputClass =
    "h-9 w-full bg-background border border-border rounded-md pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] transition-colors"
  const selectClass =
    "h-9 w-full bg-background border border-border rounded-md px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] transition-colors appearance-none cursor-pointer"

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      {/* Search */}
      <div className="w-full md:basis-2/4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search ?? ""}
            onChange={(e) => form.setValue("search", e.target.value, { shouldValidate: true })}
            placeholder="Search styles..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Category */}
      <div className="w-full md:basis-1/4">
        <div className="relative">
          <select
            value={category}
            onChange={(e) => form.setValue("category", e.target.value, { shouldValidate: true })}
            className={selectClass}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Season */}
      <div className="w-full md:basis-1/4">
        <div className="relative">
          <select
            value={season}
            onChange={(e) => form.setValue("season", e.target.value, { shouldValidate: true })}
            className={selectClass}
          >
            <option value="all">All Seasons</option>
            {seasons.map((s) => (
              <option key={s.season_id} value={s.season_id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-border px-3 text-xs font-semibold uppercase text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  )
}
