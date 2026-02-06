"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { ProductSearch } from "@/components/pos/ProductSearch"
import { Cart } from "@/components/pos/Cart"
import { CartProvider } from "@/lib/cart-context"
import { POSMobileLayout } from "@/components/pos/POSMobileLayout"

interface POSClientProps {
  defaultStoreId: string
  storeName: string
  accountId?: string | null
}

export function POSClient({ defaultStoreId, storeName, accountId: accountIdProp }: POSClientProps) {
  const [taxInclusive, setTaxInclusive] = React.useState(false)
  const [taxRatePercent, setTaxRatePercent] = React.useState(16)
  const supabase = React.useMemo(() => createClient(), [])

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
      const [settingsRes, storeRes] = await Promise.all([
        supabase
          .from("business_settings")
          .select("tax_inclusive")
          .eq("account_id", accountId)
          .single(),
        supabase.from("stores").select("tax_rate").eq("store_id", defaultStoreId).single(),
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
  }, [defaultStoreId, supabase])

  // Store this device's store and account so staff can use PIN-only login on this computer
  React.useEffect(() => {
    let cancelled = false
    async function save() {
      try {
        localStorage.setItem("vendoflow_last_store_id", defaultStoreId)
        localStorage.setItem("vendoflow_last_store_name", storeName)
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
  }, [defaultStoreId, storeName, supabase])

  return (
    <CartProvider taxInclusive={taxInclusive} taxRatePercent={taxRatePercent}>
      {/* Desktop/Tablet Landscape: Split screen (60/40) */}
      <div className="hidden h-screen overflow-hidden bg-background-light dark:bg-background-dark lg:flex">
        <div className="flex w-[60%] flex-col border-r border-zinc-200 dark:border-zinc-300">
          <div className="flex h-full flex-col">
            <div className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-300 dark:bg-white">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-900">Point of Sale</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-700">Store: {storeName}</p>
            </div>
            <div className="flex-1 overflow-hidden bg-white dark:bg-white">
              <ProductSearch defaultStoreId={defaultStoreId} />
            </div>
          </div>
        </div>
        <div className="flex w-[40%] flex-col border-l border-zinc-200 bg-white dark:border-zinc-300 dark:bg-white">
          <Cart defaultStoreId={defaultStoreId} accountId={accountIdProp} />
        </div>
      </div>
      <div className="lg:hidden">
        <POSMobileLayout defaultStoreId={defaultStoreId} storeName={storeName} accountId={accountIdProp} />
      </div>
    </CartProvider>
  )
}
