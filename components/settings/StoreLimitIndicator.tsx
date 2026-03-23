"use client"

import * as React from "react"
import { useTransition } from "react"
import { BarChart2, Plus, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { getPlanLimit } from "@/lib/plans"
import { createStore, deleteStore, type CreateStoreData } from "@/app/settings/actions"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { updateStoreProfile } from "@/app/settings/store-actions"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"

type Store = {
  store_id: string
  name: string
  tax_rate: number | null
  address?: string | null
  phone?: string | null
  logo_url?: string | null
  logo_on_receipt?: boolean | null
}

type Props = {
  planTier: string | null
  stores: Store[]
}

export function StoreLimitIndicator({ planTier, stores }: Props) {
  const [name, setName] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [editingStore, setEditingStore] = React.useState<Store | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editAddress, setEditAddress] = React.useState("")
  const [editPhone, setEditPhone] = React.useState("")
  const [editLogoUrl, setEditLogoUrl] = React.useState("")
  const [editLogoOnReceipt, setEditLogoOnReceipt] = React.useState(false)
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false)
  const supabase = React.useMemo(() => createClient(), [])

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

  const openEdit = (store: Store) => {
    setEditingStore(store)
    setEditName(store.name)
    setEditAddress(store.address || "")
    setEditPhone(store.phone || "")
    setEditLogoUrl(store.logo_url || "")
    setEditLogoOnReceipt(!!store.logo_on_receipt)
  }

  const handleSaveEdit = () => {
    if (!editingStore) return
    if (!editName.trim()) {
      toast.error("Store name is required.")
      return
    }
    startTransition(async () => {
      const result = await updateStoreProfile({
        store_id: editingStore.store_id,
        name: editName.trim(),
        address: editAddress.trim() || undefined,
        phone: editPhone.trim() || undefined,
        logo_url: editLogoUrl.trim() || undefined,
        logo_on_receipt: editLogoOnReceipt,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Store profile updated.")
      setEditingStore(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400">
            Stores: {currentStoreCount} / {maxStores}
          </span>
        </div>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/settings?tab=billing"
            }
          }}
          className="text-xs font-semibold tracking-[0.1em] uppercase text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          {(tierKey || "starter").toUpperCase()} plan
        </button>
      </div>
      <div className="bg-zinc-800 rounded-full h-1.5 w-full mt-2 mb-1">
        <div
          className="bg-emerald-400 rounded-full h-1.5 transition-all"
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

      <div className="mt-8 rounded-lg border border-zinc-700/50 bg-zinc-900 p-6">
        <div className="mb-6">
          <h3 className="font-editorial text-xl font-bold text-zinc-50 mb-1">
            Manage Stores
          </h3>
          <p className="text-sm text-zinc-500">
            View and manage your outlet locations and store details.
          </p>
        </div>

        <div className="divide-y divide-zinc-700/40">
          {stores.length === 0 ? (
            <p className="py-4 text-sm text-zinc-500">
              No stores yet. Create your first store below.
            </p>
          ) : (
            stores.map((store) => (
              <div
                key={store.store_id}
                className="flex items-start justify-between py-4 first:pt-0"
              >
                <div>
                  <div className="text-sm font-semibold text-zinc-100">
                    {store.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {[
                      store.address,
                      store.tax_rate != null ? `${store.tax_rate}% Tax` : null
                    ].filter(Boolean).join(" • ")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(store)}
                    className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                    title="Edit store profile"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(store.store_id)}
                    disabled={isDeletingId === store.store_id || stores.length <= 1}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-sm h-7 w-7 flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                    title={stores.length <= 1 ? "At least one store is required" : "Delete store"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-700/40">
          <label className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-4 block">
            Add New Store
          </label>
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <input
              placeholder="Store Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
            />
            <input
              placeholder="Address (City, Country)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || currentStoreCount >= maxStores}
            className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors disabled:opacity-50"
          >
            {isPending ? "ADDING..." : "ADD STORE"}
          </button>
        </div>
      </div>
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-0 overflow-hidden max-w-md">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="font-editorial text-xl font-bold text-zinc-50">Edit Store Profile</DialogTitle>
          </DialogHeader>
          <div className="px-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-4">
                <label className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 block">
                  Store Details
                </label>
                <div className="space-y-3">
                  <input
                    placeholder="Store name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                  />
                  <input
                    placeholder="Address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                  />
                  <input
                    placeholder="Phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <label className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 block">
                  Store Branding
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("store-logo-file") as HTMLInputElement | null
                      input?.click()
                    }}
                    disabled={isUploadingLogo}
                    className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent"
                  >
                    {isUploadingLogo ? "UPLOADING..." : "UPLOAD LOGO"}
                  </button>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={editLogoOnReceipt}
                      onCheckedChange={(v) => setEditLogoOnReceipt(v === true)}
                      className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-zinc-950"
                    />
                    <span className="text-xs text-zinc-500">
                      Show on receipt
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-zinc-950/50 mt-6 gap-3">
            <button 
              onClick={() => setEditingStore(null)}
              className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent"
            >
              CANCEL
            </button>
            <button 
              onClick={handleSaveEdit} 
              disabled={isPending}
              className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
            >
              {isPending ? "SAVING..." : "SAVE CHANGES"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

