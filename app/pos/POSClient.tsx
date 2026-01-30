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
}

export function POSClient({ defaultStoreId, storeName }: POSClientProps) {
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
      {/* iPad / Desktop: Split 65% products, 35% cart — optimized for 1024x768 */}
      <div className="hidden h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 lg:flex">
        <div className="flex w-[65%] flex-col border-r border-slate-200 dark:border-slate-800">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Point of Sale</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Store: {storeName}</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <ProductSearch defaultStoreId={defaultStoreId} />
            </div>
          </div>
        </div>
        <div className="flex w-[35%] flex-col border-l-2 border-slate-200 bg-gradient-to-b from-white to-slate-50 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/80">
          <Cart defaultStoreId={defaultStoreId} />
        </div>
      </div>
      <div className="lg:hidden">
        <POSMobileLayout defaultStoreId={defaultStoreId} storeName={storeName} />
      </div>
    </CartProvider>
  )
}
