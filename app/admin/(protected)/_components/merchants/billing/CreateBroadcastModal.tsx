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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Protocol Broadcast</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Mass secure communication</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">1</span>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identity &amp; Segment</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Internal Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. System Maintenance Notification"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Target Segment</label>
                <div className="grid grid-cols-2 gap-2">
                  {SEGMENTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSegment(s.id)}
                      className={`px-3 py-2 rounded border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        segment === s.id 
                          ? "bg-primary/10 border-primary/30 text-primary" 
                          : "bg-transparent border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Step 2: Payload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">2</span>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Template Selection</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Meta Template Pipeline</label>
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value)
                    setTemplateParams({})
                  }}
                  className="w-full bg-background border border-input rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary appearance-none"
                >
                  <option value="">Select Protocol...</option>
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {selectedTemplate && (
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Dynamic Injection</label>
                  <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate.params.map(p => (
                    <div key={p} className="space-y-1">
                      <input
                        type="text"
                        placeholder={`Param: ${p}`}
                        value={templateParams[p] || ""}
                        onChange={(e) => setTemplateParams(prev => ({ ...prev, [p]: e.target.value }))}
                        className="bg-background border border-input rounded p-2 text-[10px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none w-full"
                      />
                    </div>
                  ))}
                  </div>
                  <p className="text-[8px] text-muted-foreground font-mono italic uppercase mt-1">Note: Broadcast params currently static for all recipients.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
             <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
             <div className="space-y-1">
               <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Advisory Warning</p>
               <p className="text-[9px] text-amber-600/80 leading-relaxed font-medium uppercase font-mono tracking-tighter">
                 Broadcasts are immutable once transmitted. Ensure your parameters and target segments are calibrated correctly before initiating the secure output sequence.
               </p>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Abort
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name || !templateId || !segment}
            className="flex items-center gap-2 px-8 py-2 bg-primary text-primary-foreground rounded-md text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Initiate Sequence
          </button>
        </div>
      </div>
    </div>
  )
}
