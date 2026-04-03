import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import ReportsClient from "./_components/ReportsClient"
import ReportsLoading from "./loading"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function ReportsData() {
  // 1. Fetch Reports and Approvers (internal joins are fine)
  const { data: reports, error: reportsError } = await supabaseAdmin
    .schema(ADMIN_SCHEMA as any)
    .from("reports")
    .select(`
      *,
      approver:approved_by (
        full_name
      )
    `)
    .order("created_at", { ascending: false })

  // 2. Fetch Merchants for the filter dropdown AND for mapping names
  const { data: merchants } = await supabaseAdmin
    .from("accounts")
    .select("account_id, business_name")
    .order("business_name", { ascending: true })

  if (reportsError) {
    console.error("Error fetching reports:", reportsError)
    return <div className="p-8 text-red-500">Failed to load reports.</div>
  }

  // 3. Manually map merchant business names
  const mappedReports = (reports || []).map(r => ({
    ...r,
    accounts: merchants?.find(m => m.account_id === r.merchant_id) || { business_name: "Unknown Merchant" }
  }))

  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto pb-24">
      <ReportsClient 
        initialReports={mappedReports as any[]} 
        merchants={merchants || []} 
      />
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsLoading />}>
      <ReportsData />
    </Suspense>
  )
}
