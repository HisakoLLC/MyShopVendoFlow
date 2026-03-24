"use client"

import { useState } from "react"
import { X, Calendar, BarChart3, Loader2, Check } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface GenerateReportModalProps {
  onClose: () => void
  merchants: { account_id: string, business_name: string }[]
  onSuccess: () => void
}

export default function GenerateReportModal({ onClose, merchants, onSuccess }: GenerateReportModalProps) {
  const [merchantId, setMerchantId] = useState("")
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!merchantId) return
    setIsGenerating(true)
    const toastId = adminToast.loading("Mining Sales Data...")

    try {
      // Calculate period range
      let periodStart = date
      let periodEnd = date

      if (reportType === "weekly") {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        const start = new Date(d.setDate(diff))
        const end = new Date(d.setDate(diff + 6))
        periodStart = start.toISOString().split('T')[0]
        periodEnd = end.toISOString().split('T')[0]
      } else if (reportType === "monthly") {
        const d = new Date(date)
        const start = new Date(d.getFullYear(), d.getMonth(), 1)
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        periodStart = start.toISOString().split('T')[0]
        periodEnd = end.toISOString().split('T')[0]
      }

      const res = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, reportType, periodStart, periodEnd })
      })

      if (!res.ok) throw new Error("Failed to generate report")

      adminToast.success("Performance report generated")
      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      adminToast.error("Data mining failed")
    } finally {
      adminToast.dismiss(toastId)
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#22c55e]" />
            <h2 className="text-white font-bold tracking-tight">Generate Report</h2>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Merchant Select */}
          <div className="space-y-2">
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">Select Merchant</label>
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full bg-white/5 border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
            >
              <option value="">Select a merchant...</option>
              {merchants.map(m => (
                <option key={m.account_id} value={m.account_id}>{m.business_name}</option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">Report Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["daily", "weekly", "monthly"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                    reportType === type 
                      ? "bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e]" 
                      : "bg-white/5 border-[#1f1f1f] text-[#444] hover:text-[#666]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Period Selector */}
          <div className="space-y-2">
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">
              {reportType === "daily" ? "Select Date" : reportType === "weekly" ? "Select Week Starting" : "Select Month"}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type={reportType === "monthly" ? "month" : "date"}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <p className="text-[9px] text-[#444] italic">
              * Report will include all data for the selected {reportType} period.
            </p>
          </div>

          {/* Preview Placeholder */}
          <div className="p-4 rounded-lg bg-[#111] border border-[#1f1f1f] border-dashed text-center space-y-2">
             <div className="text-[9px] text-[#444] font-black uppercase tracking-[0.2em]">Extraction Scope</div>
             <p className="text-[10px] text-[#666]">Revenue, store performance, top 5 products, and inventory snapshot will be analyzed.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1f1f1f] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#1f1f1f] text-[11px] font-black uppercase tracking-widest text-[#444] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!merchantId || isGenerating}
            className="flex-3 py-2.5 rounded-lg bg-[#22c55e] text-black font-black text-[11px] uppercase tracking-widest hover:shadow-xl hover:shadow-[#22c55e]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Report
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
