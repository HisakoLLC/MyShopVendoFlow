import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { StaffList } from "./staff-list"

export const dynamic = "force-dynamic"

type Staff = {
  staff_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  assigned_store_id: string | null
  active: boolean | null
  has_pin: boolean
  last_login_at: string | null
  stores: {
    name: string
  } | null
}

type Account = {
  account_id: string
  plan_tier: string | null
}

async function fetchStaffData(): Promise<{
  staff: Staff[]
  account: Account
  stores: Array<{ store_id: string; name: string }>
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
  if (accountIdError || accountIdRaw == null) {
    redirect("/onboarding?redirect=/settings/staff")
  }
  const accountId =
    typeof accountIdRaw === "string"
      ? accountIdRaw
      : Array.isArray(accountIdRaw)
        ? accountIdRaw[0]
        : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
          ? (accountIdRaw as { account_id: string }).account_id
          : null
  const accountIdStr = accountId != null ? String(accountId) : ""
  if (!accountIdStr) {
    redirect("/onboarding?redirect=/settings/staff")
  }

  // Verify current user is owner (account_members.role or staff with user_metadata.role === 'owner')
  const { data: currentMember, error: memberError } = await supabase
    .from("account_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("account_id", accountIdStr)
    .maybeSingle()

  const isStaffOwner = user.email === "pos-staff@vendoflow.internal" && user.user_metadata?.role === "owner"
  const isAccountOwner = !memberError && currentMember?.role === "owner"
  if (!isStaffOwner && !isAccountOwner) {
    throw new Error("Access denied. Only owners can manage staff.")
  }

  // Fetch account to get plan_tier
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("account_id, plan_tier")
    .eq("account_id", accountIdStr)
    .single()

  if (accountError || !account) {
    throw new Error(accountError?.message ?? "Account not found.")
  }

  // Fetch stores (single-store app; do not filter by active so dropdown always has the store)
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountIdStr)
    .order("name", { ascending: true })
    .limit(10)

  if (storesError) {
    throw new Error(storesError.message)
  }

  // Fetch staff (pin_hash used only to derive has_pin; not sent to client)
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select(
      `
      staff_id,
      email,
      first_name,
      last_name,
      role,
      assigned_store_id,
      active,
      pin_hash,
      last_login_at,
      stores!staff_assigned_store_id_fkey(name)
    `
    )
    .eq("account_id", accountIdStr)
    .order("first_name", { ascending: true })

  if (staffError) {
    throw new Error(staffError.message)
  }

  // Transform to strict serializable shape (avoids RSC/serialization errors for owner/manager)
  const transformedStaff: Staff[] = []
  for (const s of staff || []) {
    try {
      const raw = s as Record<string, unknown>
      const rawStores = raw.stores
      const storesValue =
        rawStores == null
          ? null
          : Array.isArray(rawStores)
            ? (rawStores[0] as { name?: string } | undefined)
            : (rawStores as { name?: string })
      const storeName =
        storesValue && typeof storesValue === "object" && typeof storesValue.name === "string"
          ? { name: storesValue.name }
          : null
      transformedStaff.push({
        staff_id: String(raw.staff_id ?? ""),
        email: String(raw.email ?? ""),
        first_name: raw.first_name != null ? String(raw.first_name) : null,
        last_name: raw.last_name != null ? String(raw.last_name) : null,
        role: raw.role != null ? String(raw.role) : null,
        assigned_store_id: raw.assigned_store_id != null ? String(raw.assigned_store_id) : null,
        active: raw.active != null ? Boolean(raw.active) : null,
        has_pin: !!(raw.pin_hash != null && raw.pin_hash !== ""),
        last_login_at: raw.last_login_at != null ? String(raw.last_login_at) : null,
        stores: storeName,
      })
    } catch {
      // Skip rows that fail to serialize (e.g. unexpected shape after new staff create)
    }
  }

  // Ensure serializable shape for RSC (no extra keys or non-serializable values)
  const accountSafe: Account = {
    account_id: String(account?.account_id ?? ""),
    plan_tier: account?.plan_tier != null ? String(account.plan_tier) : null,
  }
  const storesSafe: Array<{ store_id: string; name: string }> = (stores || []).map((s: { store_id?: unknown; name?: unknown }) => ({
    store_id: String(s.store_id ?? ""),
    name: String(s.name ?? ""),
  }))
  return {
    staff: transformedStaff,
    account: accountSafe,
    stores: storesSafe,
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
        <div className="text-base font-semibold">Couldn't load staff</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function StaffPageContent() {
  try {
    const data = await fetchStaffData()
    if (!data?.account?.account_id) {
      return <ErrorState message="Account not found. Please complete onboarding first." />
    }
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <StaffList
          initialStaff={Array.isArray(data.staff) ? data.staff : []}
          planTier={data.account?.plan_tier || "starter"}
          stores={Array.isArray(data.stores) ? data.stores : []}
        />
      </div>
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load staff."
    return <ErrorState message={message} />
  }
}

export default function StaffPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <StaffPageContent />
    </Suspense>
  )
}
