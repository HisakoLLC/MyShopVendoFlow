"use client"

import * as React from "react"
import { MapPin, ChevronDown, Check } from "lucide-react"
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
  
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isDropdownOpen])

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev)

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
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        {canSwitchStores && multipleStores ? (
          <>
            <button 
              className="flex items-center gap-2 bg-white border border-zinc-300 rounded-md h-9 px-3 min-w-[180px] hover:border-zinc-500 transition-colors cursor-pointer"
              onClick={toggleDropdown}
            >
              <span className="text-sm font-medium text-zinc-900 flex-1 text-left truncate">
                {currentStoreName}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full right-0 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 min-w-[200px] z-50 mt-1">
                {stores.map((s) => {
                  const isSelected = s.store_id === currentStoreId
                  return (
                    <button
                      key={s.store_id}
                      onClick={() => {
                        onChangeStoreId(s.store_id)
                        setIsDropdownOpen(false)
                      }}
                      className={
                        isSelected
                          ? "w-full text-sm font-semibold text-zinc-900 px-3 py-2.5 rounded-md mx-1 bg-zinc-100 cursor-default flex items-center gap-2 text-left"
                          : "w-full text-sm text-zinc-700 px-3 py-2.5 rounded-md mx-1 hover:bg-zinc-100 cursor-pointer transition-colors flex items-center gap-2 text-left"
                      }
                      style={{ width: "calc(100% - 8px)" }}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-zinc-700 mr-1 flex-shrink-0" />
                          <span className="truncate">{s.name}</span>
                        </>
                      ) : (
                        <span className="truncate pr-3 pl-[22px]">{s.name}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <span className="text-xs text-zinc-500">
            {role === "cashier" ? "Read-only" : stores.length <= 1 ? "Single store" : ""}
          </span>
        )}
      </div>
    </header>
  )
}

