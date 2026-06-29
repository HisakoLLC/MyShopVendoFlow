import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import FinanceClient from "./_components/FinanceClient"
import { startOfMonth } from "date-fns"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function FinanceData() {
  // Fetch Platform GMV Aggregates server-side
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .select("grand_total, sale_date")
    .eq("status", "completed")

  if (salesError) {
    console.error(salesError)
    return <div className="p-8 text-red-500 font-black uppercase tracking-[0.3em] text-[10px]">Financial Data Handshake Failure</div>
  }

  const platformGMV = (sales || []).reduce((acc, s) => acc + Number(s.grand_total), 0)
  
  const monthStart = startOfMonth(new Date())
  const thisMonthGMV = (sales || [])
    .filter(s => new Date(s.sale_date) >= monthStart)
    .reduce((acc, s) => acc + Number(s.grand_total), 0)

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
          <div className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] mb-2 px-0.5">Corporate Oversight</div>
          <h1 className="font-editorial text-foreground text-5xl font-bold tracking-tight leading-none uppercase">FINANCE</h1>
        </div>
      </div>

      <FinanceClient 
        initialPlatformGMV={platformGMV} 
        initialMonthGMV={thisMonthGMV}
      />
    </div>
  )
}

export default function FinancePage() {
  return (
    <div className="px-8 py-12">
      <Suspense fallback={
        <div className="max-w-7xl mx-auto space-y-12 animate-pulse">
           <div className="h-16 w-64 bg-muted rounded-sm" />
           <div className="grid grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-sm" />)}
           </div>
           <div className="h-96 bg-muted rounded-sm" />
        </div>
      }>
         <FinanceData />
      </Suspense>
    </div>
  )
}
