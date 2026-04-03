"use client"

import { useState } from "react"
import { X, Send, Loader2, Megaphone, Info } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface CreateBroadcastModalProps {
  onClose: () => void
  onSuccess: () => void
}

const TEMPLATES = [
  { id: "onboarding_message", name: "Onboarding Welcome", params: ["name"] },
  { id: "subscription_receipt", name: "Subscription Receipt", params: ["name"] },
  { id: "overdue_invoice_reminder", name: "Overdue Invoice", params: ["name", "invoice_id", "amount", "due_date"] },
  { id: "weekly_sales_report", name: "Weekly Sales Report", params: ["name", "start_date", "end_date"] },
  { id: "monthly_sales_report", name: "Monthly Sales Report", params: ["name", "month"] },
  { id: "daily_sales_report", name: "Daily Sales Report", params: ["name", "date"] },
]

const SEGMENTS = [
  { id: "all",      name: "All Merchants" },
  { id: "active",   name: "Active Subscribers" },
  { id: "trial",    name: "Trial Users" },
  { id: "past_due", name: "Past Due / Expired" },
]

export default function CreateBroadcastModal({ onClose, onSuccess }: CreateBroadcastModalProps) {
  const [name, setName] = useState("")
  const [segment, setSegment] = useState("all")
  const [templateId, setTemplateId] = useState("")
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const selectedTemplate = TEMPLATES.find(t => t.id === templateId)

  const handleCreate = async () => {
    if (!name || !templateId || !segment) return
    
    setLoading(true)
    const toastId = adminToast.loading("Initializing Broadcast...")

    try {
      // 1. Create Broadcast entries
      // Map params in defined order to match Meta's expected sequence ({{1}}, {{2}}...)
      const orderedParams = selectedTemplate?.params.map(p => templateParams[p] || "") || []

      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          segment,
          templateName: templateId,
          templateParams: orderedParams
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create broadcast")
      }

      const { broadcastId, recipientCount } = await res.json()
      
      adminToast.loading(`Transmitting to ${recipientCount} recipients...`)

      // 2. Trigger the Send process
      const sendRes = await fetch(`/api/admin/broadcasts/${broadcastId}/send`, {
        method: "POST"
      })

      if (!sendRes.ok) throw new Error("Broadcast creation succeeded but transmission failed")

      const { sent, failed } = await sendRes.json()
      
      adminToast.success(`Broadcast Complete: ${sent} delivered, ${failed} failures.`)
      onSuccess()
    } catch (err: any) {
      adminToast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl shadow-2xl overflow-hidden glassmorphism-effect">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f1f] bg-[#161616] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-[#22c55e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Protocol Broadcast</h3>
              <p className="text-[10px] text-[#444] font-black uppercase tracking-tighter">Mass secure communication</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Step 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-4 rounded-full bg-[#22c55e] text-black text-[9px] font-black flex items-center justify-center">1</span>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#666]">Identity & Segment</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-[#444] uppercase font-black tracking-widest">Internal Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. System Maintenance Notification"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-[#444] uppercase font-black tracking-widest">Target Segment</label>
                <div className="grid grid-cols-2 gap-2">
                  {SEGMENTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSegment(s.id)}
                      className={`px-3 py-2 rounded border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        segment === s.id 
                          ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.05)]" 
                          : "bg-transparent border-[#1f1f1f] text-[#444] hover:border-white/10"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[#1f1f1f] to-transparent" />

          {/* Step 2: Payload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-4 rounded-full bg-[#22c55e] text-black text-[9px] font-black flex items-center justify-center">2</span>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#666]">Template Selection</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-[#444] uppercase font-black tracking-widest">Meta Template Pipeline</label>
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value)
                    setTemplateParams({})
                  }}
                  className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] appearance-none"
                >
                  <option value="">Select Protocol...</option>
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {selectedTemplate && (
                <div className="space-y-2">
                  <label className="text-[10px] text-[#444] uppercase font-black tracking-widest">Dynamic Injection (CSV style?)</label>
                  <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate.params.map(p => (
                    <div key={p} className="space-y-1">
                      <input
                        type="text"
                        placeholder={`Param: ${p}`}
                        value={templateParams[p] || ""}
                        onChange={(e) => setTemplateParams(prev => ({ ...prev, [p]: e.target.value }))}
                        className="bg-[#111] border border-[#1f1f1f] rounded p-2 text-[10px] text-white focus:border-[#22c55e] outline-none w-full"
                      />
                    </div>
                  ))}
                  </div>
                  <p className="text-[8px] text-[#333] font-mono italic uppercase mt-1">Note: Broadcast params currently static for all recipients.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
             <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
             <div className="space-y-1">
               <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Advisory Warning</p>
               <p className="text-[9px] text-amber-500/60 leading-relaxed font-medium uppercase font-mono tracking-tighter">
                 Broadcasts are immutable once transmitted. Ensure your parameters and target segments are calibrated correctly before initiating the secure output sequence.
               </p>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1f1f1f] bg-[#0d0d0d] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-[#444] hover:text-white transition-colors"
          >
            Abort
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name || !templateId || !segment}
            className="flex items-center gap-2 px-8 py-2 bg-[#22c55e] text-black rounded-sm text-[11px] font-black uppercase tracking-widest hover:bg-[#1eb054] transition-all shadow-lg shadow-[#22c55e]/10 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Initiate Sequence
          </button>
        </div>
      </div>
    </div>
  )
}
