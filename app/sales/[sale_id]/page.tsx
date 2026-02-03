import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { SaleDetailPageClient } from "./sale-detail-page-client"

export const dynamic = "force-dynamic"

type SaleRow = {
  sale_id: string
  receipt_number: string | null
  sale_date: string | null
  grand_total: number | null
  payment_method: string | null
  store_id: string | null
  cashier_id: string | null
  customer_id: string | null
  notes: string | null
  stores: { name: string } | null
  staff: { first_name: string | null; last_name: string | null } | null
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null
}

type PageProps = {
  params: Promise<{ sale_id: string }>
}

async function SaleDetailContent({ saleId }: { saleId: string }) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    notFound()
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] : accountIdRaw
  if (accountIdError || !accountId) {
    notFound()
  }

  const { data: stores } = await supabase
    .from("stores")
    .select("store_id")
    .eq("account_id", accountId)

  const storeIds = (stores ?? []).map((s: { store_id: string }) => s.store_id)
  if (storeIds.length === 0) notFound()

  const { data: sale, error } = await supabase
    .from("sales")
    .select(
      "sale_id, receipt_number, sale_date, grand_total, payment_method, store_id, cashier_id, customer_id, notes, stores(name), staff(first_name, last_name), customers(first_name, last_name, phone)"
    )
    .eq("sale_id", saleId)
    .in("store_id", storeIds)
    .single()

  if (error || !sale) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-4">
        <Link
          href="/sales"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          ← Back to Sales
        </Link>
      </div>
      <SaleDetailPageClient sale={sale as SaleRow} />
    </div>
  )
}

export default async function SaleDetailPage({ params }: PageProps) {
  const { sale_id } = await params
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-6">Loading sale…</div>}>
      <SaleDetailContent saleId={sale_id} />
    </Suspense>
  )
}
