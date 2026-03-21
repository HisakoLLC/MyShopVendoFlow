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
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between h-14",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
            Current Store
          </p>
          <p className="text-sm font-semibold text-zinc-900 truncate max-w-[220px] sm:max-w-xs">
            {currentStoreName || "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canSwitchStores && multipleStores ? (
          <Select value={currentStoreId ?? undefined} onValueChange={onChangeStoreId}>
            <SelectTrigger className="bg-white border border-zinc-300 rounded-md h-9 px-3 min-w-[160px] flex items-center justify-between gap-2 text-sm font-medium text-zinc-900 hover:border-zinc-500 transition-colors cursor-pointer shadow-none">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-zinc-200 rounded-lg shadow-lg py-1 min-w-[200px] z-50">
              {stores.map((s) => (
                <SelectItem 
                  key={s.store_id} 
                  value={s.store_id}
                  className="text-sm text-zinc-700 px-3 py-2.5 hover:bg-zinc-100 focus:bg-zinc-100 cursor-pointer transition-colors data-[state=checked]:bg-zinc-100 data-[state=checked]:font-semibold data-[state=checked]:text-zinc-900"
                >
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-zinc-500">
            {role === "cashier" ? "Read-only" : stores.length <= 1 ? "Single store" : ""}
          </span>
        )}
      </div>
    </header>
  )
}

