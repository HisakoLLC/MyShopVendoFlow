"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, Rocket, TrendingUp, CreditCard, Lock } from "lucide-react"
import FinanceTrendChart from "./FinanceTrendChart"
import FinanceTable from "./FinanceTable"
import RecordPaymentModal from "./RecordPaymentModal"
import PermissionGate from "../../_components/PermissionGate"

interface FinanceClientProps {
  initialTransactions: any[]
  merchants: any[]
  trendData: any[]
  aggregates: {
    totalRevenue: number
    thisMonthRevenue: number
    platformGMV: number
    thisMonthGMV: number
  }
}

export default function FinanceClient({ initialTransactions, merchants, trendData, aggregates }: FinanceClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const { totalRevenue, thisMonthRevenue, platformGMV, thisMonthGMV } = aggregates

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <PermissionGate 
      permission="finance_view"
      fallback={
        <div className="flex flex-col items-center justify-center py-20 border border-[#1f1f1f] border-dashed rounded-3xl bg-white/[0.01]">
          <Lock className="w-12 h-12 text-[#111] mb-4" />
          <h2 className="text-white text-lg font-bold tracking-tighter uppercase mb-2">Restricted Access</h2>
          <p className="text-[#444] text-[10px] font-black uppercase tracking-[0.2em] max-w-xs text-center border-t border-[#1f1f1f] pt-4 mt-2">
            This module contains highly sensitive fiscal data and is reserved for authorized financial personnel.
          </p>
        </div>
      }
    >
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "SaaS Revenue (Total)", value: `KES ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-[#22c55e]" },
            { label: "SaaS This Month", value: `KES ${thisMonthRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400" },
            { label: "Platform Volume (GMV)", value: `KES ${platformGMV.toLocaleString()}`, icon: CreditCard, color: "text-purple-400" },
            { label: "GMV This Month", value: `KES ${thisMonthGMV.toLocaleString()}`, icon: Rocket, color: "text-amber-400" },
          ].map((card, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#111] border border-[#1f1f1f] space-y-2">
              <div className="flex justify-between items-start">
                 <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="text-2xl font-black text-white tracking-tighter">{card.value}</div>
              <div className="text-[10px] text-[#444] uppercase font-bold tracking-widest">{card.label}</div>
            </div>
          ))}
        </div>

        <FinanceTrendChart data={trendData} />
        
        <div className="space-y-4">
          <h3 className="text-[10px] text-[#444] uppercase font-black tracking-[0.2em] px-1 border-l-2 border-[#22c55e]">Recent Transactions</h3>
          <FinanceTable 
            initialTransactions={initialTransactions} 
            onAddTransaction={() => setShowModal(true)} 
          />
        </div>

        {showModal && (
          <RecordPaymentModal 
            onClose={() => setShowModal(false)}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </PermissionGate>
  )
}
