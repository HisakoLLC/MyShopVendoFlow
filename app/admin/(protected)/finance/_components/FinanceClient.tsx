"use client"

import { useState, useEffect } from "react"
import { TrendingUp, DollarSign, Wallet, ShieldCheck, Zap } from "lucide-react"
import { FinanceStatsCards } from "./FinanceStatsCards"
import { OverdueInvoicesList } from "./OverdueInvoicesList"
import { ManualPaymentsTable } from "./ManualPaymentsTable"
import { PlanBreakdownGrid } from "./PlanBreakdownGrid"
import { adminToast } from "@/lib/admin/toast"

interface FinanceClientProps {
  initialPlatformGMV: number
  initialMonthGMV: number
}

export default function FinanceClient({ initialPlatformGMV, initialMonthGMV }: FinanceClientProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/finance/stats")
        const data = await res.json()
        setStats(data)
      } catch (err) {
        adminToast.error("Finance synchronization failure")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-12">
      {/* SECTION A: SaaS Revenue */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
           <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
           <h2 className="text-white text-lg font-black uppercase tracking-[0.3em]">SaaS Revenue — Internal Yield</h2>
        </div>

        <FinanceStatsCards stats={stats} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 space-y-4">
              <h3 className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em]">Subscription Infrastructure</h3>
              <PlanBreakdownGrid breakdown={stats?.breakdown || {}} loading={loading} />
           </div>
           <div className="lg:col-span-2 space-y-4">
              <h3 className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em]">Recovery Queue</h3>
              <OverdueInvoicesList />
           </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em]">Transaction Ledger</h3>
           <ManualPaymentsTable />
        </div>
      </section>

      {/* SECTION B: Platform GMV */}
      <section className="space-y-8 pt-12 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3">
           <Zap className="w-5 h-5 text-amber-500" />
           <h2 className="text-white text-lg font-black uppercase tracking-[0.3em]">Platform GMV — Merchant Flow</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="p-8 bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm group hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em]">Total Processed Volume</span>
                <Wallet className="w-4 h-4 text-amber-500 opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-white tracking-tighter">KES {initialPlatformGMV.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-[#444] uppercase tracking-widest leading-relaxed italic">Life-to-date transaction integrity</div>
              </div>
           </div>

           <div className="p-8 bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm group hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em]">Current Period Throughput</span>
                <TrendingUp className="w-4 h-4 text-amber-500 opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-white tracking-tighter">KES {initialMonthGMV.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-[#444] uppercase tracking-widest leading-relaxed italic">Real-time velocity monitoring</div>
              </div>
           </div>
        </div>

        <div className="p-8 rounded-sm border border-[#1f1f1f] border-dashed bg-white/[0.01] opacity-60">
           <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest leading-relaxed max-w-2xl italic">
              platform gmv is calculated based on completed sales processed through vendoflow pos protocols. 
              this volume represents merchant business Health rather than Corporate Revenue.
           </p>
        </div>
      </section>
    </div>
  )
}
