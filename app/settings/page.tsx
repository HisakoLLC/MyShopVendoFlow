import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
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

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    redirect("/onboarding?redirect=/settings")
  }

  // Fetch account
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("account_id, business_name, owner_email, plan_tier, subscription_status, trial_ends_at, stripe_customer_id")
    .eq("account_id", accountId)
    .single()

  if (accountError) {
    throw new Error(accountError.message)
  }

  // Fetch stores
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name, tax_rate")
    .eq("account_id", accountId)
    .eq("active", true)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(storesError.message)
  }

  // Fetch business_settings (may not exist yet or permission not yet granted)
  const { data: businessSettings, error: settingsError } = await supabase
    .from("business_settings")
    .select("logo_url, business_address, business_phone, tax_id, logo_on_receipt, receipt_header, receipt_footer, return_policy")
    .eq("account_id", accountId)
    .single()

  const raw = settingsError ? null : businessSettings ?? null
  let businessSettingsResolved: BusinessSettings | null = raw
  if (raw?.logo_url) {
    const signed = await getSignedStorageUrl(supabase, raw.logo_url)
    if (signed) {
      businessSettingsResolved = { ...raw, logo_url: signed }
    }
  }

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
