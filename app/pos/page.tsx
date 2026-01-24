import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { ProductSearch } from "@/components/pos/ProductSearch"
import { Cart } from "@/components/pos/Cart"
import { CartProvider } from "@/lib/cart-context"
import { POSMobileLayout } from "@/components/pos/POSMobileLayout"

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading POS...</p>
      </div>
    </div>
  )
}

async function POSPageContent() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    redirect("/onboarding?redirect=/pos")
  }

  // Fetch stores for inventory context
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountId)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(`Failed to load stores: ${storesError.message}`)
  }

  // Check if stores exist - if not, show a message
  if (!stores || stores.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">No Store Available</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You need to create at least one store before using the POS system.
          </p>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Please create a store in your settings or contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  // Use first store as default (or let user select in future)
  const defaultStoreId = stores[0].store_id

  return (
    <CartProvider>
      {/* Desktop/Tablet Landscape: Split screen (60/40) */}
      <div className="hidden h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 lg:flex">
        {/* Left Side - Product Search & Selection (60%) */}
        <div className="flex w-[60%] flex-col border-r border-zinc-200 dark:border-zinc-800">
          <div className="flex h-full flex-col">
            <div className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Point of Sale</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {stores && stores.length > 0 ? `Store: ${stores[0].name}` : "No store available"}
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <ProductSearch defaultStoreId={defaultStoreId} />
            </div>
          </div>
        </div>

        {/* Right Side - Cart (40%) */}
        <div className="flex w-[40%] flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <Cart defaultStoreId={defaultStoreId} />
        </div>
      </div>

      {/* Tablet Portrait & Mobile: Use mobile layout component */}
      <div className="lg:hidden">
        <POSMobileLayout defaultStoreId={defaultStoreId} storeName={stores[0].name} />
      </div>
    </CartProvider>
  )
}

export default function POSPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <POSPageContent />
    </Suspense>
  )
}
