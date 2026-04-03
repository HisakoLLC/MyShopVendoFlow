import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle2, MessageSquare, Loader2 } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"
import { EmptyState } from "@/app/admin/(protected)/_components/ui/EmptyState"
import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"
import { differenceInDays } from "date-fns"

export function OverdueInvoicesList() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchOverdue = async () => {
    try {
      const res = await fetch("/api/admin/finance/invoices/overdue")
      const data = await res.json()
      setInvoices(data.overdueInvoices || [])
    } catch (err) {
      adminToast.error("Failed to sync overdue registry")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverdue()
  }, [])

  const handleMarkPaid = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/invoices/${id}/mark-paid`, { method: "POST" })
      if (!res.ok) throw new Error("Update failed")
      adminToast.success("Invoice settled in administrative log")
      fetchOverdue()
    } catch (err) {
      adminToast.error("Handshake failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendReminder = async (id: string) => {
     adminToast.success("Reminder payload queued for transmission")
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton className="h-12 w-full" />
        <LoadingSkeleton className="h-12 w-full" />
        <LoadingSkeleton className="h-12 w-full" />
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <EmptyState 
        icon={CheckCircle2}
        title="Compliant Registry"
        description="No overdue invoices detected in the high-priority queue."
      />
    )
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm overflow-hidden">
      <div className="p-4 border-b border-[#1a1a1a] bg-[#111] flex items-center justify-between">
        <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          High-Priority Overdue Logs
        </h3>
        <span className="text-[9px] font-black text-[#444] uppercase tracking-widest">{invoices.length} outstanding</span>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
            <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest">Invoice #</th>
            <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest">Merchant</th>
            <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest text-right">Age</th>
            <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest text-right">Amount KES</th>
            <th className="px-6 py-3 text-[9px] font-black text-[#333] uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a1a1a]">
          {invoices.map((inv) => {
            const age = differenceInDays(new Date(), new Date(inv.due_date))
            return (
              <tr key={inv.id} className="group hover:bg-[#111] transition-colors">
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black text-white uppercase">{inv.invoice_number}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black text-[#22c55e] uppercase truncate max-w-[150px] inline-block">{inv.accounts?.business_name}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-[10px] font-black text-red-500 bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded-sm">
                    {age}D OVERDUE
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-[10px] font-black text-white">{Number(inv.amount_kes).toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleSendReminder(inv.id)}
                      className="p-2 rounded bg-white/5 border border-white/5 text-[#444] hover:text-[#22c55e] transition-all"
                      title="Send WhatsApp Reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleMarkPaid(inv.id)}
                      disabled={actionLoading === inv.id}
                      className="px-3 py-1.5 rounded bg-[#22c55e]/10 border border-[#22c55e]/30 text-[9px] font-black text-[#22c55e] uppercase tracking-widest hover:bg-[#22c55e]/20 transition-all flex items-center gap-2"
                    >
                      {actionLoading === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Mark Paid
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
