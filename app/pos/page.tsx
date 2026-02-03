import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { POSClient } from "./POSClient"
import { BindStaffThenPOS } from "./BindStaffThenPOS"

const POS_STAFF_SHARED_EMAIL = "pos-staff@vendoflow.internal"

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

async function POSPageContent({
  searchParams,
}: {
  searchParams: Promise<{ staff_id?: string; account_id?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const params = await searchParams

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/pin-login?redirect=/pos")
  }

  // Owner: account from RPC. Staff: account from user_metadata (set after bind-staff).
  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountIdFromRpc = Array.isArray(accountIdRaw)
    ? accountIdRaw[0]
    : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  const accountIdFromMeta = user?.user_metadata?.account_id as string | undefined
  const accountId = accountIdFromRpc ?? accountIdFromMeta ?? null

  // Staff with staff_id & account_id in URL: always run bind-staff so session gets correct staff + role.
  // (URL params come from PIN login and identify the current staff; shared user may have had previous metadata.)
  if (
    user.email === POS_STAFF_SHARED_EMAIL &&
    params.staff_id &&
    params.account_id
  ) {
    return (
      <BindStaffThenPOS staffId={params.staff_id} accountId={params.account_id} />
    )
  }

  // Staff already have session but no role in JWT — re-run bind-staff so nav/middleware get role.
  const staffIdFromMeta = user?.user_metadata?.staff_id as string | undefined
  const hasRole = Boolean(user?.user_metadata?.role)
  if (
    user?.email === POS_STAFF_SHARED_EMAIL &&
    staffIdFromMeta &&
    accountIdFromMeta &&
    !hasRole
  ) {
    return (
      <BindStaffThenPOS staffId={staffIdFromMeta} accountId={accountIdFromMeta} />
    )
  }

  if (!accountId) {
    redirect("/onboarding?redirect=/pos")
  }

  // Fetch the account's single store (one store per account)
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountId)
    .order("name", { ascending: true })
    .limit(1)

  if (storesError) {
    throw new Error(`Failed to load store: ${storesError.message}`)
  }

  if (!stores || stores.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4 dark:bg-background">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-background p-8 shadow-lg dark:border-zinc-800 dark:bg-background">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Store Not Set Up</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Complete setup in Settings to create your store, then you can use the POS.
          </p>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Go to Settings or contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  const defaultStoreId = stores[0].store_id
  const storeName = stores[0].name

  return <POSClient defaultStoreId={defaultStoreId} storeName={storeName} />
}

export default async function POSPage({
  searchParams,
}: {
  searchParams: Promise<{ staff_id?: string; account_id?: string }>
}) {
  return (
    <Suspense fallback={<LoadingState />}>
      <POSPageContent searchParams={searchParams} />
    </Suspense>
  )
}
