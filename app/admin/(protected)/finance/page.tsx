import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import FinanceClient from "./_components/FinanceClient"
import { CreditCard, Rocket, TrendingUp, Users } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function FinanceData() {
  // 1. Fetch Transactions
  const { data: transactions, error } = await supabaseAdmin
    .schema("vendo_admin" as any)
    .from("finance_transactions")
    .select(`
      *,
      accounts:merchant_id ( business_name )
    `)
    .order("transaction_date", { ascending: false })

  // 2. Fetch Merchants for the modal
  const { data: merchants } = await supabaseAdmin
    .from("accounts")
    .select("id:account_id, name:business_name")
    .order("business_name")

  if (error) {
    console.error(error)
    return <div className="p-8 text-red-500 font-bold uppercase tracking-widest text-[10px]">Error loading financial data</div>
  }

  const txList = (transactions as any[]) || []
  
  // 3. Process Aggregates
  const totalRevenue = txList.reduce((acc, tx) => acc + (tx.type !== 'expense' ? parseFloat(tx.amount) : -parseFloat(tx.amount)), 0)
  
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const currentMonthTx = txList.filter(tx => {
    const d = new Date(tx.transaction_date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const lastMonthTx = txList.filter(tx => {
    const d = new Date(tx.transaction_date)
    const lm = thisMonth === 0 ? 11 : thisMonth - 1
    const ly = thisMonth === 0 ? thisYear - 1 : thisYear
    return d.getMonth() === lm && d.getFullYear() === ly
  })

  const thisMonthRevenue = currentMonthTx.reduce((acc, tx) => acc + (tx.type !== 'expense' ? parseFloat(tx.amount) : -parseFloat(tx.amount)), 0)
  const lastMonthRevenue = lastMonthTx.reduce((acc, tx) => acc + (tx.type !== 'expense' ? parseFloat(tx.amount) : -parseFloat(tx.amount)), 0)
  
  const growth = lastMonthRevenue === 0 ? 100 : ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100

  // 4. Trend Data (last 6 months)
  const months = []
  for (let i = 5; i >= 0; i--) {
     const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
     const mStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
     const monthTotal = txList
       .filter(tx => tx.transaction_date.startsWith(mStr))
       .reduce((acc, tx) => acc + (tx.type !== 'expense' ? parseFloat(tx.amount) : -parseFloat(tx.amount)), 0)
     months.push({ month: mStr, amount: Math.max(0, monthTotal) })
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[#444] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Corporate Oversight</div>
          <h1 className="text-white text-3xl font-bold tracking-tighter">Finance Dashboard</h1>
        </div>
      </div>

      <FinanceClient 
        initialTransactions={txList} 
        merchants={merchants || []} 
        trendData={months}
        aggregates={{
          totalRevenue,
          thisMonthRevenue,
          lastMonthRevenue,
          growth
        }}
      />

      <div className="p-8 rounded-2xl border border-[#1f1f1f] border-dashed bg-white/[0.01] opacity-50 space-y-4">
         <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-[#444]" />
            <h3 className="text-white text-sm font-bold tracking-tight uppercase tracking-widest">SaaS Billing Engine Coming Soon</h3>
         </div>
         <p className="text-xs text-[#555] max-w-xl">
            We are building a native subscription management layer. Future updates will include automated invoice generation, 
            MRR tracking via Stripe/DodoPayments, and churn rate analytics. Manual entries will eventually be replaced by 
            real-time payment hooks.
         </p>
         <div className="flex gap-4">
            {["Invoice Generation", "MRR Tracking", "Churn Analytics", "Overdue Reminders"].map((feat, i) => (
              <div key={i} className="px-3 py-1.5 rounded border border-[#1f1f1f] text-[9px] font-black text-[#333] uppercase">
                {feat}
              </div>
            ))}
         </div>
      </div>
    </div>
  )
}

function DollarSign(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

export default function FinancePage() {
  return (
    <div className="px-8 py-8">
      <Suspense fallback={<div className="text-white p-8">Loading Revenue Data...</div>}>
         <FinanceData />
      </Suspense>
    </div>
  )
}
