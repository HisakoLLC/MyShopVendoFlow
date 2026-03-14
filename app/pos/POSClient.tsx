"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { ProductSearch } from "@/components/pos/ProductSearch"
import { Cart } from "@/components/pos/Cart"
import { CartProvider } from "@/lib/cart-context"
import { POSMobileLayout } from "@/components/pos/POSMobileLayout"
import { POSHeader } from "@/components/pos/POSHeader"

interface POSClientProps {
  defaultStoreId: string
  storeName: string
  accountId?: string | null
}

export function POSClient({ defaultStoreId, storeName, accountId: accountIdProp }: POSClientProps) {
  const [taxInclusive, setTaxInclusive] = React.useState(false)
  const [taxRatePercent, setTaxRatePercent] = React.useState(16)
  const [role, setRole] = React.useState<"owner" | "manager" | "cashier">("owner")
  const [stores, setStores] = React.useState<Array<{ store_id: string; name: string }>>([])
  const [currentStoreId, setCurrentStoreId] = React.useState<string | null>(defaultStoreId)
  const [currentStoreName, setCurrentStoreName] = React.useState<string>(storeName)
  const supabase = React.useMemo(() => createClient(), [])

  // Resolve current store context (supports multi-store + role)
  React.useEffect(() => {
    let cancelled = false
    async function load() {
      let preferredId: string | null = null
      try {
        preferredId = window.localStorage.getItem("vendoflow_last_store_id")
      } catch {
        // ignore
      }
      const url = preferredId
        ? `/api/current-store?preferred_store_id=${encodeURIComponent(preferredId)}`
        : "/api/current-store"

      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as
        | {
            current_store: { store_id: string; name: string } | null
            all_stores: { store_id: string; name: string }[]
            role: "owner" | "manager" | "cashier"
          }
        | { error: string }
      if (cancelled) return
      if ("error" in data) return

      setRole(data.role)
      setStores(data.all_stores ?? [])
      if (data.current_store?.store_id) {
        setCurrentStoreId(data.current_store.store_id)
        setCurrentStoreName(data.current_store.name ?? "")
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: accountIdRaw } = await supabase.rpc("get_account_id")
      const accountId = Array.isArray(accountIdRaw)
        ? accountIdRaw[0]
        : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
          ? (accountIdRaw as { account_id: string }).account_id
          : accountIdRaw
      if (!accountId) return
      const storeIdForTax = currentStoreId ?? defaultStoreId
      const [settingsRes, storeRes] = await Promise.all([
        supabase
          .from("business_settings")
          .select("tax_inclusive")
          .eq("account_id", accountId)
          .single(),
        supabase.from("stores").select("tax_rate").eq("store_id", storeIdForTax).single(),
      ])
      if (cancelled) return
      const taxIncl = (settingsRes.data as { tax_inclusive?: boolean | null } | null)?.tax_inclusive ?? false
      const taxRate = (storeRes.data as { tax_rate: number | null } | null)?.tax_rate ?? 16
      setTaxInclusive(!!taxIncl)
      setTaxRatePercent(taxRate)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [defaultStoreId, currentStoreId, supabase])

  // Store this device's store and account so staff can use PIN-only login on this computer
  React.useEffect(() => {
    let cancelled = false
    async function save() {
      try {
        const effectiveStoreId = currentStoreId ?? defaultStoreId
        const effectiveStoreName = currentStoreName || storeName
        localStorage.setItem("vendoflow_last_store_id", effectiveStoreId)
        localStorage.setItem("vendoflow_last_store_name", effectiveStoreName)
        const { data: accountIdRaw } = await supabase.rpc("get_account_id")
        if (cancelled) return
        const accountId = Array.isArray(accountIdRaw)
          ? accountIdRaw[0]
          : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
            ? (accountIdRaw as { account_id: string }).account_id
            : accountIdRaw
        if (accountId) localStorage.setItem("vendoflow_last_account_id", String(accountId))
      } catch {
        // ignore
      }
    }
    save()
    return () => {
      cancelled = true
    }
  }, [defaultStoreId, storeName, currentStoreId, currentStoreName, supabase])

  const handleChangeStoreId = React.useCallback(
    (storeId: string) => {
      setCurrentStoreId(storeId)
      const selected = stores.find((s) => s.store_id === storeId)
      setCurrentStoreName(selected?.name ?? "")
      try {
        window.localStorage.setItem("vendoflow_last_store_id", storeId)
        if (selected?.name) window.localStorage.setItem("vendoflow_last_store_name", selected.name)
      } catch {
        // ignore
      }
    },
    [stores]
  )

  return (
    <CartProvider taxInclusive={taxInclusive} taxRatePercent={taxRatePercent}>
      <POSHeader
        role={role}
        stores={stores.length > 0 ? stores : [{ store_id: defaultStoreId, name: storeName }]}
        currentStoreId={currentStoreId ?? defaultStoreId}
        currentStoreName={currentStoreName || storeName}
        onChangeStoreId={handleChangeStoreId}
      />
      {/* Desktop/Tablet Landscape: Split screen (60/40) */}
      <div className="hidden h-[calc(100vh-44px)] overflow-hidden bg-[#f8f8f8] lg:flex">
        <div className="flex w-[60%] flex-col border-r border-zinc-200 dark:border-zinc-200">
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden">
              <ProductSearch defaultStoreId={currentStoreId ?? defaultStoreId} />
            </div>
          </div>
        </div>
        <div className="flex w-[40%] flex-col border-l border-zinc-200 bg-white dark:border-zinc-200 dark:bg-white">
          <Cart defaultStoreId={currentStoreId ?? defaultStoreId} accountId={accountIdProp} storeName={currentStoreName || storeName} />
        </div>
      </div>
      <div className="lg:hidden">
        <POSMobileLayout defaultStoreId={currentStoreId ?? defaultStoreId} storeName={currentStoreName || storeName} accountId={accountIdProp} />
      </div>
    </CartProvider>
  )
}
