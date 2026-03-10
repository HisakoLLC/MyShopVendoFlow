"use client"

import * as React from "react"
import { useTransition } from "react"
import { BarChart2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { getPlanLimit } from "@/lib/plans"
import { createStore, deleteStore, type CreateStoreData } from "@/app/settings/actions"
import { Input } from "@/components/ui/input"

type Store = {
  store_id: string
  name: string
  tax_rate: number | null
}

type Props = {
  planTier: string | null
  stores: Store[]
}

export function StoreLimitIndicator({ planTier, stores }: Props) {
  const [name, setName] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const tierKey = (planTier || "starter").toLowerCase()
  const maxStores = getPlanLimit(planTier)
  const currentStoreCount = stores.length
  const utilization = Math.min(100, (currentStoreCount / maxStores) * 100)

  const nextPlanTier =
    tierKey === "starter" ? "core" : tierKey === "core" ? "scale" : "scale"

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Store name is required.")
      return
    }
    startTransition(async () => {
      const payload: CreateStoreData = {
        name: name.trim(),
        address: address.trim() || undefined,
        tax_rate: undefined,
      }
      const result = await createStore(payload)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Store created.")
      setName("")
      setAddress("")
    })
  }

  const handleDelete = (storeId: string) => {
    setIsDeletingId(storeId)
    startTransition(async () => {
      const result = await deleteStore(storeId)
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success("Store deleted.")
      }
      setIsDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            Stores: {currentStoreCount} / {maxStores}
          </span>
        </div>
        <span className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
          {(tierKey || "starter").toUpperCase()} plan
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
          style={{ width: `${utilization}%` }}
        />
      </div>

      {currentStoreCount >= maxStores && (
        <Alert className="mt-2">
          <AlertTitle>Store limit reached</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2 text-sm">
            Upgrade to <span className="font-semibold capitalize">{nextPlanTier}</span> to add
            more stores.
            <Button
              variant="ghost"
              size="sm"
              className="px-0"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/settings?tab=billing"
                }
              }}
            >
              Upgrade now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Manage stores
          </span>
        </div>

        <div className="space-y-2">
          {stores.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No stores yet. Create your first store below.
            </p>
          ) : (
            stores.map((store) => (
              <div
                key={store.store_id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {store.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tax rate: {store.tax_rate != null ? `${store.tax_rate}%` : "Not set"}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                  onClick={() => handleDelete(store.store_id)}
                  disabled={isDeletingId === store.store_id || stores.length <= 1}
                  title={stores.length <= 1 ? "At least one store is required" : "Delete store"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="New store name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:flex-1"
            />
            <Input
              placeholder="Address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="sm:flex-1"
            />
          </div>
          <Button
            className="mt-1 gap-2"
            size="sm"
            onClick={handleCreate}
            disabled={isPending || currentStoreCount >= maxStores}
          >
            <Plus className="h-4 w-4" />
            {isPending ? "Adding..." : "Add Store"}
          </Button>
        </div>
      </div>
    </div>
  )
}

