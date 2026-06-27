import { useState, useEffect } from "react"
import { CreditCard, ArrowUpRight, Loader2, Plus, Receipt } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"
import { EmptyState } from "@/app/admin/(protected)/_components/ui/EmptyState"
import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"
import RecordPaymentModal from "./RecordPaymentModal"

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
      <div className="space-y-6 font-sans">
        <div className="flex justify-end">
           <button 
             onClick={() => setIsRecordModalOpen(true)}
             className="px-4 py-2 rounded-md bg-[#E8400C] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#c73508] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
           >
              <Plus className="w-4 h-4" />
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
    <div className="space-y-6 font-sans">
      <div className="flex justify-end">
         <button 
           onClick={() => setIsRecordModalOpen(true)}
           className="px-4 py-2 rounded-md bg-[#E8400C] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#c73508] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
         >
            <Plus className="w-4 h-4" />
            Record M-Pesa/Wire Payment
         </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#E8400C]" />
            Corporate Manual Ledger
          </h3>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{payments.length} recent entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Merchant</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount KES</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((tx) => (
                <tr key={tx.id} className="group hover:bg-accent/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold text-foreground">{new Date(tx.payment_date).toLocaleDateString()}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs font-bold text-foreground uppercase">{tx.accounts?.business_name}</div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase">{tx.period_start} → {tx.period_end}</div>
                  </td>
                  <td className="px-5 py-3.5">
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tx.payment_method}</span>
                     </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold text-muted-foreground font-mono">{tx.mpesa_code || tx.wire_reference || "NO_REF"}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums">
                    <span className="text-xs font-bold text-foreground truncate max-w-[150px] inline-block">{Number(tx.amount_kes).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                      tx.status === 'confirmed' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-500 border-amber-500/20 bg-amber-500/10'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${tx.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{tx.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isRecordModalOpen && (
         <RecordPaymentModal 
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
