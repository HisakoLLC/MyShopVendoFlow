import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { POSClient } from "./POSClient"

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground"></div>
        <p className="text-sm text-muted-foreground">Loading POS...</p>
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
    redirect("/auth/pin-login?redirect=/pos")
  }

  // Check if user is staff (has auth_user_id in staff table)
  const { data: staffRecord } = await supabase
    .from("staff")
    .select("account_id, active, role, assigned_store_id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  // Get account_id: from staff record if staff, otherwise from account_members (owner)
  let accountId: string | null = null

  if (staffRecord) {
    if (!staffRecord.active) {
      // Staff is deactivated, sign them out
      await supabase.auth.signOut()
      redirect("/auth/pin-login?error=account_deactivated")
    }
    accountId = staffRecord.account_id
  } else {
    // Owner: get from account_members
    const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
    accountId = Array.isArray(accountIdRaw)
      ? accountIdRaw[0]
      : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
        ? (accountIdRaw as { account_id: string }).account_id
        : accountIdRaw
    if (accountIdError || !accountId) {
      redirect("/onboarding?redirect=/pos")
    }
  }

  if (!accountId) {
    redirect("/onboarding?redirect=/pos")
  }

  // Resolve default store:
  // - For cashiers (and any staff with assigned_store_id): use assigned store directly.
  // - Otherwise (owner/manager): fall back to first store for the account.
  const assignedStoreId =
    staffRecord?.assigned_store_id && typeof staffRecord.assigned_store_id === "string"
      ? staffRecord.assigned_store_id
      : null

  const { data: stores, error: storesError } = assignedStoreId
    ? await supabase
        .from("stores")
        .select("store_id, name")
        .eq("store_id", assignedStoreId)
        .limit(1)
    : await supabase
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
      <div className="flex h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground">Store not set up yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn&apos;t have a store configured yet. Ask your manager or account owner to complete store setup in <strong>Settings</strong>, then you can use the POS.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            If you&apos;re the owner, go to Settings to add your store.
          </p>
        </div>
      </div>
    )
  }

  const defaultStoreId = stores[0].store_id
  const storeName = stores[0].name

  return (
    <POSClient
      defaultStoreId={defaultStoreId}
      storeName={storeName}
      accountId={accountId}
    />
  )
}

export default async function POSPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <POSPageContent />
    </Suspense>
  )
}
