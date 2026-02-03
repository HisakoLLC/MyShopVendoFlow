"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

  // Debounce only the search input.
  React.useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch((search ?? "").trim()), 300)
    return () => clearTimeout(handle)
  }, [search])

  // Emit changes: category/season immediate; search debounced.
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

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="w-full md:basis-3/5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search ?? ""}
            onChange={(e) => form.setValue("search", e.target.value, { shouldValidate: true })}
            placeholder="Search styles..."
            className="h-11 w-full rounded-lg border border-zinc-200 bg-background pl-10 pr-3 text-sm outline-none ring-offset-2 transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-background dark:text-zinc-50 dark:focus:ring-zinc-100/10"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 md:basis-2/5 md:flex-row">
        <div className="w-full md:basis-1/2">
          <Select
            value={category}
            onValueChange={(v) => form.setValue("category", v, { shouldValidate: true })}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.category_id} value={c.category_id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:basis-1/2">
          <Select
            value={season}
            onValueChange={(v) => form.setValue("season", v, { shouldValidate: true })}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasons.map((s) => (
                <SelectItem key={s.season_id} value={s.season_id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}
