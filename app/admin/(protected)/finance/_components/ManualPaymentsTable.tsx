import { useState, useEffect } from "react"
import { CreditCard, ArrowUpRight, Loader2, Plus, Receipt } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"
import { EmptyState } from "@/app/admin/(protected)/_components/ui/EmptyState"
import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"
import { RecordPaymentModal } from "@/app/admin/(protected)/_components/merchants/billing/RecordPaymentModal"

export function ManualPaymentsTable() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/finance/payments")
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (err) {
      adminToast.error("Protocol sync error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  if (loading) {
     return (
       <div className="space-y-3">
         <LoadingSkeleton className="h-12 w-full" />
         <LoadingSkeleton className="h-12 w-full" />
       </div>
     )
  }

  if (payments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
           <button 
             onClick={() => setIsRecordModalOpen(true)}
             className="px-4 py-2 rounded bg-[#22c55e] text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#1eb054] transition-all flex items-center gap-2"
           >
              <Plus className="w-3.5 h-3.5" />
              Record M-Pesa/Wire Payment
           </button>
        </div>
        <EmptyState 
          icon={Receipt}
          title="Manual Ledger Empty"
          description="No recent manual transmissions (M-Pesa, Wire, Cash) detected in the corporate ledger."
        />
        {isRecordModalOpen && (
           <RecordPaymentModal 
             accountId=""
             onClose={() => setIsRecordModalOpen(false)}
             onSuccess={() => {
                setIsRecordModalOpen(false)
                fetchPayments()
             }}
           />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
         <button 
           onClick={() => setIsRecordModalOpen(true)}
           className="px-4 py-2 rounded bg-[#22c55e] text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#1eb054] transition-all flex items-center gap-2"
         >
            <Plus className="w-3.5 h-3.5" />
            Record M-Pesa/Wire Payment
         </button>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm overflow-hidden">
        <div className="p-4 border-b border-[#1a1a1a] bg-[#111] flex items-center justify-between">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-[#22c55e]" />
            Corporate Manual Ledger
          </h3>
          <span className="text-[9px] font-black text-[#444] uppercase tracking-widest">{payments.length} recent entries</span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest">Date</th>
              <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest">Merchant</th>
              <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest">Method</th>
              <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest">Reference</th>
              <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest text-right">Amount KES</th>
              <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {payments.map((tx) => (
              <tr key={tx.id} className="group hover:bg-[#111] transition-colors">
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black text-white uppercase">{new Date(tx.payment_date).toLocaleDateString()}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[10px] font-black text-[#22c55e] uppercase">{tx.accounts?.business_name}</div>
                  <div className="text-[8px] font-bold text-[#444] uppercase">{tx.period_start} → {tx.period_end}</div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-black text-[#444] uppercase tracking-widest">{tx.payment_method}</span>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black text-[#666] font-mono">{tx.mpesa_code || tx.wire_reference || "NO_REF"}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-[10px] font-black text-white truncate max-w-[150px] inline-block">{Number(tx.amount_kes).toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border ${
                    tx.status === 'confirmed' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-amber-500 border-amber-500/20 bg-amber-500/5'
                  }`}>
                    <div className={`w-1 h-1 rounded-full ${tx.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{tx.status}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isRecordModalOpen && (
         <RecordPaymentModal 
           accountId=""
           onClose={() => setIsRecordModalOpen(false)}
           onSuccess={() => {
              setIsRecordModalOpen(false)
              fetchPayments()
           }}
         />
      )}
    </div>
  )
}
