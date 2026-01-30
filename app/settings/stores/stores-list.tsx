"use client"

import * as React from "react"
import { Plus, Edit, Trash2, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StoreFormModal } from "./store-form-modal"
import { deactivateStore, deleteStore } from "./actions"
import { toast, Toaster } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Store = {
  store_id: string
  name: string
  address: string | null
  tax_rate: number | null
  timezone: string | null
  active: boolean | null
}

type StoresListProps = {
  stores: Store[]
  planTier: string
}

const planLimits: Record<string, number> = {
  starter: 1,
  core: 3,
  scale: 10,
}

const planNames: Record<string, string> = {
  starter: "Starter",
  core: "Core",
  scale: "Scale",
}

export function StoresList({ stores, planTier }: StoresListProps) {
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [editingStore, setEditingStore] = React.useState<Store | null>(null)
  const [deactivatingStore, setDeactivatingStore] = React.useState<Store | null>(null)
  const [deletingStore, setDeletingStore] = React.useState<Store | null>(null)
  const [storesList, setStoresList] = React.useState<Store[]>(stores)

  const maxStores = planLimits[planTier] || 1
  const currentCount = storesList.length
  const canAddMore = currentCount < maxStores

  const handleStoreCreated = () => {
    setShowAddModal(false)
    // Refresh will happen via revalidation
    window.location.reload()
  }

  const handleStoreUpdated = () => {
    setEditingStore(null)
    // Refresh will happen via revalidation
    window.location.reload()
  }

  const handleDeactivate = async () => {
    if (!deactivatingStore) return

    try {
      await deactivateStore(deactivatingStore.store_id)
      toast.success("Store deactivated successfully")
      setDeactivatingStore(null)
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to deactivate store.")
    }
  }

  const handleDelete = async () => {
    if (!deletingStore) return

    try {
      await deleteStore(deletingStore.store_id)
      toast.success("Store deleted permanently")
      setDeletingStore(null)
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete store.")
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Stores
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your store locations ({currentCount}/{maxStores} used)
          </p>
        </div>
        {canAddMore ? (
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Store
          </Button>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 dark:border-yellow-900/40 dark:bg-yellow-950/30">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              Store limit reached.{" "}
              {planTier === "starter" ? (
                <span>Upgrade to Core to add more stores.</span>
              ) : planTier === "core" ? (
                <span>Upgrade to Scale to add more stores.</span>
              ) : (
                <span>Maximum stores reached.</span>
              )}
            </p>
          </div>
        )}
      </div>

      {storesList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              No stores yet
            </h3>
            <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Create your first store to get started with inventory management.
            </p>
            {canAddMore && (
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Store
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {storesList.map((store) => (
            <Card
              key={store.store_id}
              className={store.active === false ? "opacity-60" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {store.name}
                      {store.active === false && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    {store.address && (
                      <CardDescription className="mt-1">{store.address}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {store.tax_rate !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Tax Rate</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {store.tax_rate}%
                      </span>
                    </div>
                  )}
                  {store.timezone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Timezone</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {store.timezone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingStore(store)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {store.active !== false && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeactivatingStore(store)}
                      >
                        Deactivate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                      onClick={() => setDeletingStore(store)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StoreFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleStoreCreated}
      />

      {editingStore && (
        <StoreFormModal
          open={!!editingStore}
          store={editingStore}
          onClose={() => setEditingStore(null)}
          onSuccess={handleStoreUpdated}
        />
      )}

      <AlertDialog open={!!deactivatingStore} onOpenChange={(open) => !open && setDeactivatingStore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Store?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deactivatingStore?.name}"? This store will be
              hidden from POS and reports. You can reactivate it later by editing the store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-red-600 hover:bg-red-500">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingStore} onOpenChange={(open) => !open && setDeletingStore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete store?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deletingStore?.name}"? This will remove
              the store from your account and cannot be undone. If the store has sales or inventory
              data, you may need to deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
