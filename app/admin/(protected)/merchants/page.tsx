import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import MerchantsTable, { MerchantListItem } from "./_components/MerchantsTable"
import MerchantsLoading from "./loading"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function MerchantsData() {
  // 1. Fetch accounts with related store/product counts and owner staff
  // Filter staff to role='owner' via the query
  // Use explicit casting to bypass inferred join errors from the Supabase client types
  const { data: accounts, error: accountError } = (await supabaseAdmin
    .from("accounts")
    .select(`
      account_id,
      business_name,
      created_at,
      staff(email, role),
      stores(count),
      product_styles(count)
    `)
    .order("created_at", { ascending: false })) as any

  if (accountError) {
    console.error("Error fetching accounts:", accountError)
    throw new Error("Failed to load merchants")
  }

  // 2. Fetch sales joined with stores to calculate total sales per account
  // We need to associate grand_total with account_id via the store
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .select(`
      grand_total,
      stores (
        account_id
      )
    `)

  if (salesError) {
    console.error("Error fetching sales for aggregation:", salesError)
  }

  // 3. Aggregate sales by account_id
  const salesMap: Record<string, number> = {}
  sales?.forEach((sale) => {
    const accountId = (sale.stores as any)?.account_id
    if (accountId) {
      salesMap[accountId] = (salesMap[accountId] || 0) + Number(sale.grand_total)
    }
  })

  // 4. Map to MerchantListItem shape
  const merchantList: MerchantListItem[] = (accounts as any[]).map((acc: any) => {
    // Find the owner email (first staff with role 'owner')
    const owner = acc.staff?.find((s: any) => s.role === "owner")
    
    return {
      account_id: acc.account_id,
      business_name: acc.business_name || "Untitled Business",
      owner_email: owner?.email || "No owner found",
      store_count: (acc.stores as any)?.[0]?.count || 0,
      product_count: (acc.product_styles as any)?.[0]?.count || 0,
      total_sales: salesMap[acc.account_id] || 0,
      created_at: acc.created_at,
    }
  })

  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[#444] text-[10px] tracking-widest uppercase font-bold">
            Merchant Management
          </p>
          <h1 className="text-white text-2xl font-bold tracking-tight">Merchants</h1>
        </div>
        
        <div className="bg-[#111] border border-[#1f1f1f] px-4 py-2 rounded-full flex items-center gap-3">
          <span className="text-[#444] text-[10px] font-bold tracking-widest uppercase">System Accounts</span>
          <span className="text-white text-sm font-bold">{merchantList.length}</span>
        </div>
      </div>

      <MerchantsTable merchants={merchantList} />
    </div>
  )
}

export default function MerchantsPage() {
  return (
    <Suspense fallback={<MerchantsLoading />}>
      <MerchantsData />
    </Suspense>
  )
}
