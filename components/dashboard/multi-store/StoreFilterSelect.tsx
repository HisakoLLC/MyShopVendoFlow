"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type StoreFilterStore = { store_id: string; name: string }

export function StoreFilterSelect({
  stores,
  selectedStoreId,
}: {
  stores: StoreFilterStore[]
  selectedStoreId: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const value = selectedStoreId ?? "all"

  const onChange = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === "all") {
        params.delete("store")
      } else {
        params.set("store", next)
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">View:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[220px]">
          <SelectValue placeholder="All Stores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stores</SelectItem>
          {stores.map((s) => (
            <SelectItem key={s.store_id} value={s.store_id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

