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
        : (accountIdRaw as { account_id?: string })?.account_id
  if (!accountId) {
    redirect("/onboarding?redirect=/settings/staff")
  }

  // Verify current user is owner
  const { data: currentMember, error: memberError } = await supabase
    .from("account_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .single()

  if (memberError || !currentMember || currentMember.role !== "owner") {
    throw new Error("Access denied. Only owners can manage staff.")
  }

  // Fetch account to get plan_tier
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("account_id, plan_tier")
    .eq("account_id", accountId)
    .single()

  if (accountError) {
    throw new Error(accountError.message)
  }

  // Fetch stores
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountId)
    .eq("active", true)
    .order("name", { ascending: true })

  if (storesError) {
    throw new Error(storesError.message)
  }

  // Fetch staff
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
      stores!staff_assigned_store_id_fkey(name)
    `
    )
    .eq("account_id", accountId)
    .order("first_name", { ascending: true })

  if (staffError) {
    throw new Error(staffError.message)
  }

  // Transform to strict serializable shape (avoids RSC/serialization errors for owner/manager)
  const transformedStaff: Staff[] = (staff || []).map((s: Record<string, unknown>) => {
    const rawStores = s.stores
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
    return {
      staff_id: String(s.staff_id ?? ""),
      email: String(s.email ?? ""),
      first_name: s.first_name != null ? String(s.first_name) : null,
      last_name: s.last_name != null ? String(s.last_name) : null,
      role: s.role != null ? String(s.role) : null,
      assigned_store_id: s.assigned_store_id != null ? String(s.assigned_store_id) : null,
      active: s.active != null ? Boolean(s.active) : null,
      stores: storeName,
    }
  })

  return {
    staff: transformedStaff,
    account: account as Account,
    stores: (stores || []) as Array<{ store_id: string; name: string }>,
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
  let data: { staff: Staff[]; account: Account; stores: Array<{ store_id: string; name: string }> }
  try {
    data = await fetchStaffData()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load staff."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <StaffList
        initialStaff={data.staff}
        planTier={data.account.plan_tier || "starter"}
        stores={data.stores}
      />
    </div>
  )
}

export default function StaffPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <StaffPageContent />
    </Suspense>
  )
}
