import { Suspense } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { CustomersList } from "./customers-list"

export const dynamic = "force-dynamic"

type Customer = {
  customer_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  is_vip: boolean | null
  total_spend: number | null
  transaction_count: number | null
  first_purchase_date: string | null
  last_purchase_date: string | null
  notes: string | null
}

async function fetchCustomers(): Promise<Customer[]> {
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
    redirect("/onboarding?redirect=/customers")
  }

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select(
      "customer_id, first_name, last_name, email, phone, is_vip, total_spend, transaction_count, first_purchase_date, last_purchase_date, notes"
    )
    .eq("account_id", accountId)
    .order("last_purchase_date", { ascending: false, nullsFirst: false })

  if (customersError) {
    throw new Error(customersError.message)
  }

  return (customers || []) as Customer[]
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
        <div className="text-base font-semibold">Couldn't load customers</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
    </div>
  )
}

async function CustomersPageContent() {
  let customers: Customer[]
  try {
    customers = await fetchCustomers()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load customers."
    return <ErrorState message={message} />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <CustomersList initialCustomers={customers} />
    </div>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CustomersPageContent />
    </Suspense>
  )
}
