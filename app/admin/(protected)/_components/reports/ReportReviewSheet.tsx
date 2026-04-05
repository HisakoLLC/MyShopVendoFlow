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

  const data = report.report_data || {}
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
    <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-[#0a0a0a] border-l border-[#1f1f1f] z-[300] overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-10 border-b border-[#1f1f1f] px-8 py-6 flex justify-between items-center">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e] text-[8px] font-black uppercase tracking-widest border border-[#22c55e]/20">
               {report.report_type}
             </span>
             <span className="text-[#444] text-[10px] uppercase font-bold tracking-widest leading-none">• Review Draft</span>
           </div>
           <h2 className="text-white text-xl font-bold tracking-tight">{report.accounts?.business_name}</h2>
        </div>
        <button onClick={onClose} className="p-2 text-[#444] hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-8 space-y-10">
        {data.pdf_url && (
          <div className="flex items-center justify-between p-4 bg-white/5 border border-[#1f1f1f] rounded-xl hover:bg-white/10 transition-colors">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
                 <BarChart3 className="w-5 h-5 text-red-400" />
               </div>
               <div>
                 <h3 className="text-white text-sm font-bold tracking-tight">Generated Report Document</h3>
                 <p className="text-[10px] text-[#888]">A styled PDF dashboard has been generated for this period.</p>
               </div>
             </div>
             <a href={data.pdf_url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
               View PDF <ArrowRight className="w-3.5 h-3.5" />
             </a>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Revenue", value: `KES ${summary.total_revenue?.toLocaleString()}`, icon: TrendingUp, color: "text-[#22c55e]" },
            { label: "Transactions", value: summary.transaction_count, icon: CreditCard, color: "text-blue-400" },
            { label: "Avg Basket", value: `K ${Math.round(summary.avg_basket || 0)}`, icon: Users, color: "text-purple-400" },
            { label: "Low Stock", value: inventory.low_stock, icon: Package, color: "text-red-400" },
          ].map((kpi, i) => (
            <div key={i} className="p-4 rounded-xl bg-[#111] border border-[#1f1f1f] space-y-1">
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.color} mb-1`} />
              <div className="text-white text-lg font-bold tracking-tight leading-none">{kpi.value}</div>
              <div className="text-[9px] text-[#444] uppercase font-bold tracking-wider">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-[#1f1f1f] pb-2">
             <h3 className="text-[10px] text-[#444] uppercase font-black tracking-[0.2em]">Store Performance</h3>
             <div className="text-[10px] text-[#666] font-mono">{formatDate(report.period_start)} → {formatDate(report.period_end)}</div>
          </div>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#161616] text-[#444] border-b border-[#1f1f1f]">
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Store</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Revenue</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {breakdowns.stores?.map((store: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-white font-medium">{store.name}</td>
                    <td className="px-4 py-3 text-[#22c55e] font-mono">KES {store.revenue?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#888] text-right">{store.count} sales</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] text-[#444] uppercase font-black tracking-[0.2em] border-b border-[#1f1f1f] pb-2">Top 5 Products</h3>
          <div className="space-y-3">
             {breakdowns.top_products?.map((product: any, i: number) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#111] border border-[#1f1f1f]">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#333] italic">0{i+1}</span>
                    <div className="text-white text-xs font-semibold">{product.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#22c55e] text-xs font-bold">KES {product.revenue?.toLocaleString()}</div>
                    <div className="text-[9px] text-[#444] uppercase font-bold">{product.units} units</div>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="pt-10 border-t border-[#1f1f1f]">
          <PermissionGate 
            permission="reports_approve"
            fallback={
              <div className="p-4 rounded-lg bg-red-400/5 border border-red-400/10 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-[10px] text-red-400 uppercase font-black tracking-widest italic">You do not have reporting approval privileges.</p>
              </div>
            }
          >
            {showRejectionInput ? (
              <div className="space-y-4">
                <label className="text-[10px] text-red-400 uppercase font-black tracking-[0.2em]">Rejection Notes</label>
                <textarea
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Explain why this report is being rejected..."
                  className="w-full h-24 bg-white/5 border border-red-400/20 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-red-400/50 transition-colors"
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowRejectionInput(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-[#444]">Cancel</button>
                  <button onClick={handleReject} disabled={!rejectionNote || isProcessing} className="flex-2 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Confirm Rejection</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowRejectionInput(true)}
                  className="flex-1 py-3.5 border border-[#1f1f1f] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                  Reject Report
                </button>
                <button 
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-2 py-3.5 bg-[#22c55e] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-[#22c55e]/10 flex items-center justify-center gap-2"
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
