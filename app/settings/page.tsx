import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
// Note: We pass public URLs to client - StorageImage component handles signing client-side
import { SettingsTabs } from "./settings-tabs"

export const dynamic = "force-dynamic"

type Account = {
  account_id: string
  business_name: string
  owner_email: string
  plan_tier: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  stripe_customer_id: string | null
}

type Store = {
  store_id: string
  name: string
  tax_rate: number | null
}

type BusinessSettings = {
  logo_url: string | null
  business_address: string | null
  business_phone: string | null
  tax_id: string | null
  logo_on_receipt: boolean | null
  receipt_header: string | null
  receipt_footer: string | null
  return_policy: string | null
  currency: string | null
  tax_inclusive: boolean | null
}

async function fetchSettingsData(): Promise<{
  account: Account
  stores: Store[]
  businessSettings: BusinessSettings | null
}> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw)
    ? accountIdRaw[0]
    : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (accountIdError || !accountId) {
    redirect("/onboarding?redirect=/settings")
  }

  // Fetch account: prefer RPC (bypasses RLS for staff; run GET_ACCOUNT_FOR_SETTINGS.sql), else direct table
  let account: Account | null = null
  const { data: accountRows, error: accountError } = await supabase.rpc("get_account_for_settings")
  if (!accountError && accountRows != null) {
    const row = Array.isArray(accountRows) ? accountRows[0] : accountRows
    if (row && typeof row === "object") account = row as Account
  }
  if (!account) {
    const { data: accountDirect, error: directError } = await supabase
      .from("accounts")
      .select("account_id, business_name, owner_email, plan_tier, subscription_status, trial_ends_at, stripe_customer_id")
      .eq("account_id", accountId)
      .maybeSingle()
    if (!directError && accountDirect) account = accountDirect as Account
  }

  if (!account) {
    throw new Error("Account not found.")
  }

  const { data: storesRows, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name, tax_rate")
    .eq("account_id", accountId)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(storesError.message)
  }
  const stores = storesRows ?? []

  // Fetch business_settings (may not exist yet; use maybeSingle so 0 rows doesn't throw)
  const { data: businessSettings, error: settingsError } = await supabase
    .from("business_settings")
    .select("logo_url, business_address, business_phone, tax_id, logo_on_receipt, receipt_header, receipt_footer, return_policy, currency, tax_inclusive")
    .eq("account_id", accountId)
    .maybeSingle()

  // Pass public URL to client - StorageImage component will handle signing client-side
  // This ensures fresh signed URLs on each page load and avoids expiration issues
  const businessSettingsResolved: BusinessSettings | null = settingsError ? null : businessSettings ?? null

  return {
    account: account as Account,
    stores: (stores || []) as Store[],
    businessSettings: businessSettingsResolved,
  }
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="text-base font-semibold">Couldn't load settings</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function SettingsPageContent() {
  let data: {
    account: Account
    stores: Store[]
    businessSettings: BusinessSettings | null
  }
  try {
    data = await fetchSettingsData()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load settings."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Business Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Configure your business profile, tax settings, and receipt customization.
        </p>
      </div>

      <SettingsTabs
        account={data.account}
        stores={data.stores}
        businessSettings={data.businessSettings}
      />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SettingsPageContent />
    </Suspense>
  )
}
