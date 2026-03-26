import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import ReportsClient from "./_components/ReportsClient"
import ReportsLoading from "./loading"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function ReportsData() {
  // 1. Fetch Reports with joins
  // merchant_id -> public.accounts
  // approver_id -> admin.admin_users
  const { data: reports, error: reportsError } = await supabaseAdmin
    .schema("vendo_admin" as any)
    .from("reports")
    .select(`
      *,
      accounts:merchant_id (
        business_name
      ),
      approver:approved_by (
        full_name
      )
    `)
    .order("created_at", { ascending: false })

  if (reportsError) {
    console.error("Error fetching reports:", reportsError)
    return <div className="p-8 text-red-500">Failed to load reports.</div>
  }

  // 2. Fetch Merchants for the filter dropdown
  const { data: merchants } = await supabaseAdmin
    .from("accounts")
    .select("account_id, business_name")
    .order("business_name", { ascending: true })

  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto pb-24">
      <ReportsClient 
        initialReports={reports as any[]} 
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
