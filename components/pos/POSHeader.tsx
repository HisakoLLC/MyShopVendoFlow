"use client"

import * as React from "react"
import { MapPin } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type StaffRole = "owner" | "manager" | "cashier"

type Store = { store_id: string; name: string }

type Props = {
  className?: string
  role: StaffRole
  stores: Store[]
  currentStoreId: string | null
  currentStoreName: string
  onChangeStoreId: (storeId: string) => void
}

export function POSHeader({
  className,
  role,
  stores,
  currentStoreId,
  currentStoreName,
  onChangeStoreId,
}: Props) {
  const canSwitchStores = role === "owner" || role === "manager"
  const multipleStores = stores.length > 1

  return (
    <div
      className={cn(
        "sticky top-0 z-50 w-full border-b border-emerald-700/30 bg-emerald-500 text-white",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-90">
              Current Store
            </div>
            <div className="truncate text-sm font-semibold">
              {currentStoreName || "—"}
            </div>
          </div>
        </div>

        {canSwitchStores && multipleStores ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium opacity-90 sm:inline">Switch:</span>
            <Select value={currentStoreId ?? undefined} onValueChange={onChangeStoreId}>
              <SelectTrigger className="h-9 min-w-[180px] border-white/30 bg-white/10 text-white hover:bg-white/15">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.store_id} value={s.store_id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="text-xs font-medium opacity-90">
            {role === "cashier" ? "Read-only" : stores.length <= 1 ? "Single store" : ""}
          </div>
        )}
      </div>
    </div>
  )
}

