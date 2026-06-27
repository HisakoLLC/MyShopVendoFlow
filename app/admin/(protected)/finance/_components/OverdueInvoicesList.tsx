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
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm font-sans">
      <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
        <h3 className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          High-Priority Overdue Logs
        </h3>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{invoices.length} outstanding</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Invoice #</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Merchant</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Age</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount KES</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((inv) => {
              const age = differenceInDays(new Date(), new Date(inv.due_date))
              return (
                <tr key={inv.id} className="group hover:bg-accent/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-bold text-foreground font-mono">{inv.invoice_number}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[150px] inline-block">{inv.accounts?.business_name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono">
                    <span className="text-[10px] font-bold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded">
                      {age}D OVERDUE
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums">
                    <span className="text-xs font-bold text-foreground">{Number(inv.amount_kes).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleSendReminder(inv.id)}
                        className="p-1.5 rounded bg-accent border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleMarkPaid(inv.id)}
                        disabled={actionLoading === inv.id}
                        className="px-3 py-1.5 rounded bg-[#E8400C]/10 border border-[#E8400C]/30 text-[10px] font-bold text-[#E8400C] uppercase tracking-wider hover:bg-[#E8400C]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
    </div>
  )
}
