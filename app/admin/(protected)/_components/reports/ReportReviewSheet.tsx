"use client"

import { useState } from "react"
import { adminToast } from "@/lib/admin/toast"
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Package, 
  ArrowRight,
  Loader2,
  AlertCircle,
  Send
} from "lucide-react"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import PermissionGate from "../PermissionGate"

interface ReportReviewSheetProps {
  report: any
  onClose: () => void
  onAction: () => void
}

export default function ReportReviewSheet({ report, onClose, onAction }: ReportReviewSheetProps) {
  const adminUser = useAdminUser()
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectionNote, setRejectionNote] = useState("")
  const [showRejectionInput, setShowRejectionInput] = useState(false)

  const data = report.data || {}
  const summary = data.summary || {}
  const breakdowns = data.breakdowns || {}
  const inventory = data.inventory || {}

  const canApprove = adminUser.role === "super_admin" || adminUser.role === "reporting"

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    const toastId = adminToast.loading("Publishing report...")
    try {
      const res = await fetch(`/api/admin/reports/${report.id}/approve`, { method: "PATCH" })
      if (!res.ok) throw new Error("Failed to approve")
      adminToast.success("Performance report published")
      onAction()
      onClose()
    } catch (error) {
       console.error(error)
       adminToast.error("Publishing protocol failed")
    } finally {
      adminToast.dismiss(toastId)
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionNote) return
    setIsProcessing(true)
    const toastId = adminToast.loading("Processing rejection...")
    try {
      const res = await fetch(`/api/admin/reports/${report.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionNote })
      })
      if (!res.ok) throw new Error("Failed to reject")
      adminToast.success("Report rejected & feedback saved")
      onAction()
      onClose()
    } catch (error) {
       console.error(error)
       adminToast.error("Rejection update failed")
    } finally {
      adminToast.dismiss(toastId)
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-border z-[300] overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300 font-sans">
      <div className="sticky top-0 bg-card/80 backdrop-blur-md z-10 border-b border-border px-8 py-6 flex justify-between items-center">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="px-1.5 py-0.5 rounded bg-[#E8400C]/10 text-[#E8400C] text-[9px] font-bold uppercase tracking-wider border border-[#E8400C]/20">
               {report.report_type}
             </span>
             <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider leading-none">• Review Draft</span>
           </div>
           <h2 className="text-foreground text-xl font-bold tracking-tight">{report.accounts?.business_name}</h2>
        </div>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-8 space-y-10">
        {data.pdf_url && (
          <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-lg hover:bg-accent transition-colors">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#E8400C]/10 flex items-center justify-center">
                 <BarChart3 className="w-5 h-5 text-[#E8400C]" />
               </div>
               <div>
                 <h3 className="text-foreground text-sm font-bold tracking-tight">Generated Report Document</h3>
                 <p className="text-xs text-muted-foreground">A styled PDF dashboard has been generated for this period.</p>
               </div>
             </div>
             <a href={data.pdf_url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-[#E8400C] text-white text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-[#c73508] transition-colors flex items-center gap-2 shadow-sm">
               View PDF <ArrowRight className="w-3.5 h-3.5" />
             </a>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Revenue", value: `KES ${summary.total_revenue?.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-500" },
            { label: "Transactions", value: summary.transaction_count, icon: CreditCard, color: "text-blue-500" },
            { label: "Avg Basket", value: `K ${Math.round(summary.avg_basket || 0)}`, icon: Users, color: "text-purple-500" },
            { label: "Low Stock", value: inventory.low_stock, icon: Package, color: "text-destructive" },
          ].map((kpi, i) => (
            <div key={i} className="p-4 rounded-md bg-muted/30 border border-border space-y-1">
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.color} mb-1`} />
              <div className="text-foreground text-lg font-bold tracking-tight leading-none font-mono">{kpi.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-border pb-2">
             <h3 className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Store Performance</h3>
             <div className="text-xs text-muted-foreground font-mono">{formatDate(report.period_start)} → {formatDate(report.period_end)}</div>
          </div>
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Store</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Revenue</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {breakdowns.stores?.map((store: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-foreground font-semibold">{store.name}</td>
                    <td className="px-4 py-3 text-emerald-500 font-mono font-bold">KES {store.revenue?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-right">{store.count} sales</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider border-b border-border pb-2">Top 5 Products</h3>
          <div className="space-y-2">
             {breakdowns.top_products?.map((product: any, i: number) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground/40 font-mono">0{i+1}</span>
                    <div className="text-foreground text-xs font-semibold">{product.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-500 text-xs font-mono font-bold">KES {product.revenue?.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">{product.units} units</div>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="pt-10 border-t border-border">
          <PermissionGate 
            permission="reports_approve"
            fallback={
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-xs text-destructive uppercase font-semibold tracking-wider">You do not have reporting approval privileges.</p>
              </div>
            }
          >
            {showRejectionInput ? (
              <div className="space-y-4">
                <label className="text-[10px] text-destructive uppercase font-bold tracking-wider">Rejection Notes</label>
                <textarea
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Explain why this report is being rejected..."
                  className="w-full h-24 bg-background border border-destructive/30 rounded-md p-4 text-xs text-foreground focus:outline-none focus:border-destructive transition-colors font-medium"
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowRejectionInput(false)} className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
                  <button onClick={handleReject} disabled={!rejectionNote || isProcessing} className="flex-2 py-2.5 bg-destructive text-destructive-foreground rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-destructive/90 cursor-pointer shadow-sm disabled:opacity-50">Confirm Rejection</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowRejectionInput(true)}
                  className="flex-1 py-3 border border-border text-foreground rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-accent transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-destructive" />
                  Reject Report
                </button>
                <button 
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-2 py-3 bg-[#E8400C] text-white rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-[#c73508] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve & Publish
                </button>
              </div>
            )}
          </PermissionGate>
        </div>
      </div>
    </div>
  )
}
