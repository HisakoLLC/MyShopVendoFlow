"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { MapPin } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type StaffRole = "owner" | "manager" | "cashier"

type CurrentStoreApiResponse =
  | {
      current_store: { store_id: string; name: string } | null
      all_stores: { store_id: string; name: string }[]
      account_id: string | null
      role: StaffRole
      assigned_store_id: string | null
      error?: undefined
    }
  | {
      error: string
    }

const STORE_ID_KEY = "vendoflow_last_store_id"
const STORE_NAME_KEY = "vendoflow_last_store_name"
const ACCOUNT_ID_KEY = "vendoflow_last_account_id"

type StoreSelectorProps = {
  /** Optional extra classNames for layout integration */
  className?: string
}

export function StoreSelector({ className }: StoreSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [role, setRole] = React.useState<StaffRole | null>(null)
  const [assignedStoreId, setAssignedStoreId] = React.useState<string | null>(null)
  const [stores, setStores] = React.useState<{ store_id: string; name: string }[]>([])
  const [currentStoreId, setCurrentStoreId] = React.useState<string | null>(null)

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/auth/")

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        let preferredId: string | null = null
        try {
          preferredId = window.localStorage.getItem(STORE_ID_KEY)
        } catch {
          // ignore
        }

        const url = preferredId
          ? `/api/current-store?preferred_store_id=${encodeURIComponent(preferredId)}`
          : "/api/current-store"

        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) {
          const message = (await res.json().catch(() => null)) as { error?: string } | null
          if (!cancelled) {
            setError(message?.error || "Unable to load stores.")
          }
          return
        }

        const data = (await res.json()) as CurrentStoreApiResponse
        if ("error" in data) {
          if (!cancelled) setError(data.error || "Unable to load stores.")
          return
        }

        if (cancelled) return

        setRole(data.role)
        setAssignedStoreId(data.assigned_store_id ?? null)
        setStores(data.all_stores || [])

        const apiCurrent = data.current_store
        let nextStoreId = apiCurrent?.store_id ?? null
        let nextStoreName = apiCurrent?.name ?? ""

        // Prefer locally stored store_id if it is still valid
        try {
          const savedStoreId = window.localStorage.getItem(STORE_ID_KEY)
          if (savedStoreId && data.all_stores?.some((s) => s.store_id === savedStoreId)) {
            nextStoreId = savedStoreId
            nextStoreName =
              data.all_stores.find((s) => s.store_id === savedStoreId)?.name ??
              apiCurrent?.name ??
              ""
          }

          if (nextStoreId) {
            window.localStorage.setItem(STORE_ID_KEY, nextStoreId)
          }
          if (nextStoreName) {
            window.localStorage.setItem(STORE_NAME_KEY, nextStoreName)
          }
          if (data.account_id) {
            window.localStorage.setItem(ACCOUNT_ID_KEY, data.account_id)
          }
        } catch {
          // Ignore localStorage errors (e.g. SSR, disabled storage)
        }

        setCurrentStoreId(nextStoreId)
      } catch {
        if (!cancelled) {
          setError("Unable to load stores.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = React.useCallback(
    (value: string) => {
      setCurrentStoreId(value)
      const selected = stores.find((s) => s.store_id === value)
      try {
        window.localStorage.setItem(STORE_ID_KEY, value)
        if (selected?.name) {
          window.localStorage.setItem(STORE_NAME_KEY, selected.name)
        }
      } catch {
        // ignore
      }

      // Refresh the current page so server components pick up the new store
      router.refresh()
    },
    [router, stores]
  )

  // Hide entirely on auth-related pages
  if (isAuthPage) return null

  const multipleStores = stores.length > 1
  // Cashiers should never switch stores; managers/owners can.
  const isStaffWithFixedStore = role === "cashier" || (!!assignedStoreId && role !== "owner")

  // Badge showing how many stores exist (if multiple)
  const storeCountBadge =
    stores.length > 1 ? (
      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        {stores.length} stores
      </span>
    ) : null

  const currentStoreName =
    stores.find((s) => s.store_id === currentStoreId)?.name ??
    stores.find((s) => s.store_id === assignedStoreId)?.name ??
    "Current store"

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-transparent px-2 py-1",
        className
      )}
      aria-label="Store selector"
    >
      <span className="inline-flex items-center text-sm font-medium text-zinc-800 dark:text-zinc-100">
        <span className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <MapPin className="h-3 w-3" aria-hidden="true" />
        </span>
        <span className="mr-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Store
        </span>
      </span>

      {loading ? (
        <div className="h-8 min-w-[8rem] animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      ) : error ? (
        <span className="text-xs text-red-600 dark:text-red-400" title={error}>
          Store unavailable
        </span>
      ) : !currentStoreId || stores.length === 0 ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">No store configured</span>
      ) : isStaffWithFixedStore ? (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {currentStoreName}
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <Select value={currentStoreId ?? undefined} onValueChange={handleChange}>
            <SelectTrigger className="h-8 min-w-[9rem] border-emerald-500/40 bg-emerald-50 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/50 dark:bg-emerald-900/30 dark:text-emerald-200">
              <SelectValue
                placeholder="Select store"
                aria-label={stores.find((s) => s.store_id === currentStoreId)?.name}
              >
                <span className="truncate">
                  {stores.find((s) => s.store_id === currentStoreId)?.name ?? "Select store"}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.store_id} value={store.store_id}>
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      store.store_id === currentStoreId && "font-semibold text-emerald-700"
                    )}
                  >
                    <span className="mr-1 text-xs">📍</span>
                    <span className="truncate">{store.name}</span>
                    {store.store_id === currentStoreId && (
                      <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                        Current
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {storeCountBadge}
        </div>
      )}
    </div>
  )
}

