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
                  {store.address && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {store.address}
                    </div>
                  )}
                  {store.phone && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {store.phone}
                    </div>
                  )}
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tax rate: {store.tax_rate != null ? `${store.tax_rate}%` : "Not set"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    onClick={() => openEdit(store)}
                    title="Edit store profile"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit store profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Store name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Input
              placeholder="Address"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
            <Input
              placeholder="Phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
            <Input
              placeholder="Logo URL (optional)"
              value={editLogoUrl}
              onChange={(e) => setEditLogoUrl(e.target.value)}
              disabled
            />
            <input
              id="store-logo-file"
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={async (e) => {
                if (!editingStore) return
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  setIsUploadingLogo(true)
                  // Resolve account_id for path scoping
                  const { data: accountIdRaw, error: accountError } = await supabase.rpc("get_account_id")
                  if (accountError || !accountIdRaw) {
                    toast.error("Account not found. Please reload and try again.")
                    return
                  }
                  const accountId =
                    typeof accountIdRaw === "string"
                      ? accountIdRaw
                      : Array.isArray(accountIdRaw)
                        ? accountIdRaw[0]
                        : accountIdRaw && typeof accountIdRaw === "object" && "account_id" in accountIdRaw
                          ? (accountIdRaw as { account_id: string }).account_id
                          : null
                  if (!accountId) {
                    toast.error("Account not found. Please reload and try again.")
                    return
                  }

                  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
                  const filePath = `${accountId}/stores/${editingStore.store_id}/${Date.now()}.${ext}`

                  const { error: uploadError } = await supabase.storage
                    .from("business-logos")
                    .upload(filePath, file, {
                      cacheControl: "3600",
                      upsert: false,
                    })

                  if (uploadError) {
                    toast.error(uploadError.message || "Failed to upload logo.")
                    return
                  }

                  const { data: publicData } = supabase.storage
                    .from("business-logos")
                    .getPublicUrl(filePath)

                  const url = publicData.publicUrl
                  setEditLogoUrl(url)
                  setEditLogoOnReceipt(true)
                  toast.success("Store logo uploaded.")
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Failed to upload logo."
                  )
                } finally {
                  setIsUploadingLogo(false)
                  e.target.value = ""
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.getElementById("store-logo-file") as HTMLInputElement | null
                input?.click()
              }}
              disabled={isUploadingLogo}
            >
              {isUploadingLogo ? "Uploading..." : "Upload Logo"}
            </Button>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={editLogoOnReceipt}
                onCheckedChange={(v) => setEditLogoOnReceipt(v === true)}
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Show this logo on receipt
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStore(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

