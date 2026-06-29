"use client"

import { useState, useEffect, useMemo } from "react"
import { X, Loader2, Send, ChevronRight, ChevronLeft, Check, AlertTriangle, Users, Calendar, MessageSquare, Info } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface CreateBroadcastModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

const TEMPLATES = [
  { id: "marketing_blast", name: "Marketing Blast", params: ["merchant_name", "discount_code"] },
  { id: "urgent_maintenance", name: "Urgent Maintenance", params: ["merchant_name", "service_name", "downtime"] },
  { id: "payment_reminder", name: "Payment Reminder", params: ["merchant_name", "amount", "due_date"] },
  { id: "feature_release", name: "New Feature Alert", params: ["merchant_name", "feature_name"] },
  { id: "support_status", name: "Support Ticket Update", params: ["merchant_name", "ticket_id"] },
  { id: "onboarding_welcome", name: "Welcome Protocol", params: ["merchant_name", "onboarding_url"] },
  { id: "subscription_activated", name: "Protocol Activated", params: ["merchant_name", "plan_name"] },
]

const SEGMENTS = ["All", "Active", "Trial", "Past Due", "Starter", "Core", "Scale", "Custom"]

export function CreateBroadcastModal({ isOpen, onClose, onCreated }: CreateBroadcastModalProps) {
  const [step, setStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  
  // Step 1: Message
  const [name, setName] = useState("")
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [params, setParams] = useState<Record<string, string>>({})

  // Step 2: Recipients
  const [segment, setSegment] = useState("Active")
  const [preview, setPreview] = useState({ totalMerchantCount: 0, eligibleCount: 0, skippedCount: 0 })

  // Step 3: Schedule
  const [sendNow, setSendNow] = useState(true)
  const [scheduledAt, setScheduledAt] = useState("")

  useEffect(() => {
    if (isOpen && step === 2) {
       handlePreviewRecipients()
    }
  }, [isOpen, step, segment])

  const handlePreviewRecipients = async () => {
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/admin/broadcasts?previewOnly=true&segment=${segment}`)
      const data = await res.json()
      setPreview(data)
    } catch (err) {
      console.error("Preview failed", err)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleCreate = async () => {
    setIsCreating(true)
    const toastId = adminToast.loading("Configuring broadcast sequence...")
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          templateName: template.id,
          templateParams: params,
          segment,
          scheduledAt: sendNow ? null : scheduledAt
        })
      })

      if (!res.ok) throw new Error("Creation failed")
      const { broadcast } = await res.json()

      if (!sendNow) {
        adminToast.success("Broadcast scheduled successfully")
      } else {
        // Trigger send if immediate
        await fetch(`/api/admin/broadcasts/${broadcast.id}/send`, { method: "POST" })
        adminToast.success("Broadcast sequence initiated")
      }
      
      onCreated()
    } catch (err) {
      adminToast.error("Handshake failed")
    } finally {
      setIsCreating(false)
      adminToast.dismiss(toastId)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-background border border-border rounded-sm shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">New Broadcast Protocol</h3>
            <div className="flex items-center gap-4">
               {[1, 2, 3].map(s => (
                 <div key={s} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                      step === s ? "bg-primary text-primary-foreground" : step > s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                        {step > s ? <Check className="w-2.5 h-2.5" /> : s}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${step === s ? "text-foreground" : "text-muted-foreground"}`}>
                       {s === 1 ? "Configure" : s === 2 ? "Segment" : "Transmission"}
                    </span>
                 </div>
               ))}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Broadcast Name</label>
                <input
                  type="text"
                  placeholder="e.g. Easter Promo - Active Merchants"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-input rounded-sm p-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Template Selection</label>
                <select
                  value={template.id}
                  onChange={(e) => {
                    const t = TEMPLATES.find(t => t.id === e.target.value)
                    if (t) setTemplate(t)
                  }}
                  className="w-full bg-background border border-input rounded-sm p-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all cursor-pointer font-medium uppercase tracking-tight"
                >
                  {TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {template.params.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-primary">
                     <MessageSquare className="w-3.5 h-3.5" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Dynamic Parameters</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {template.params.map(p => (
                       <div key={p} className="space-y-1.5">
                         <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{p.replace('_', ' ')}</label>
                         <input
                           type="text"
                           placeholder={p === 'merchant_name' ? "Auto-filled" : "Enter value..."}
                           value={params[p] || ""}
                           onChange={(e) => setParams(prev => ({ ...prev, [p]: e.target.value }))}
                           className="w-full bg-background border border-input rounded-sm p-3 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                         />
                       </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-sm italic text-[9px] text-muted-foreground">
                     <Info className="w-3 h-3 text-primary" />
                     Hint: Parameter "merchant_name" will be automatically populated for each recipient.
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="grid grid-cols-4 gap-3">
                {SEGMENTS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSegment(s)}
                    className={`p-4 rounded-sm border text-left transition-all relative overflow-hidden group ${
                      segment === s 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "bg-background border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest relative z-10">{s}</div>
                    <Users className={`absolute -right-2 -bottom-2 w-12 h-12 opacity-5 ${segment === s ? "text-primary-foreground" : "text-foreground"}`} />
                  </button>
                ))}
              </div>

              <div className="p-8 rounded-sm bg-muted border border-border flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                 <div className="text-muted-foreground text-[9px] font-black uppercase tracking-[0.3em]">Estimated Output</div>
                 {loadingPreview ? (
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                 ) : (
                    <div className="text-center space-y-2">
                       <div className="text-4xl font-black text-foreground tracking-tighter">~{preview.eligibleCount}</div>
                       <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Verified Recipients</div>
                    </div>
                 )}
                 <div className="flex items-center gap-6 pt-4 border-t border-border w-full justify-center">
                    <div className="text-center">
                       <div className="text-xs font-black text-foreground">{preview.totalMerchantCount}</div>
                       <div className="text-[8px] font-bold text-muted-foreground uppercase">Total Account Pool</div>
                    </div>
                    <div className="w-px h-6 bg-border" />
                    <div className="text-center">
                       <div className="text-xs font-black text-amber-500">{preview.skippedCount}</div>
                       <div className="text-[8px] font-bold text-muted-foreground uppercase">Unlinked / Skipped</div>
                    </div>
                 </div>
              </div>

              {preview.eligibleCount > 50 && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-sm flex items-start gap-4">
                   <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                   <div className="space-y-1">
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">High Volume Warning</h4>
                      <p className="text-[10px] text-amber-500/70 leading-relaxed font-medium">Broadcasts over 50 recipients will be processed in batches with a 200ms throttle. Estimated time: ~{Math.ceil(preview.eligibleCount * 0.2)} seconds.</p>
                   </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSendNow(true)}
                    className={`p-6 rounded-sm border text-left transition-all ${
                      sendNow 
                        ? "bg-primary/10 border-primary text-primary" 
                        : "bg-background border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                     <Send className="w-6 h-6 mb-4" />
                     <div className="text-sm font-black uppercase tracking-tight text-foreground mb-1">Send Immediately</div>
                     <p className="text-[10px] text-muted-foreground leading-relaxed">Initiate the broadcast sequence as soon as configuration is verified.</p>
                  </button>

                  <button 
                    onClick={() => setSendNow(false)}
                    className={`p-6 rounded-sm border text-left transition-all ${
                      !sendNow 
                        ? "bg-primary/10 border-primary text-primary" 
                        : "bg-background border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                     <Calendar className="w-6 h-6 mb-4" />
                     <div className="text-sm font-black uppercase tracking-tight text-foreground mb-1">Schedule Protocol</div>
                     <p className="text-[10px] text-muted-foreground leading-relaxed">Designate a specific temporal window for automated transmission.</p>
                  </button>
               </div>

               {!sendNow && (
                 <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Transmission Window</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full bg-background border border-input rounded-sm p-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                    />
                 </div>
               )}

               <div className="p-6 bg-background border border-border rounded-sm space-y-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-2">Configuration Summary</div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                     <div className="space-y-1">
                        <div className="text-[8px] font-black text-muted-foreground uppercase">Identity</div>
                        <div className="text-xs font-bold text-foreground uppercase">{name || "Unnamed Broadcast"}</div>
                     </div>
                     <div className="space-y-1">
                        <div className="text-[8px] font-black text-muted-foreground uppercase">Protocol Template</div>
                        <div className="text-xs font-bold text-primary uppercase">{template.name}</div>
                     </div>
                     <div className="space-y-1">
                        <div className="text-[8px] font-black text-muted-foreground uppercase">Segment Channel</div>
                        <div className="text-xs font-bold text-foreground uppercase">{segment}</div>
                     </div>
                     <div className="space-y-1">
                        <div className="text-[8px] font-black text-muted-foreground uppercase">Recipients</div>
                        <div className="text-xs font-bold text-foreground uppercase">{preview.eligibleCount} Merchants</div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-border flex items-center justify-between bg-muted/20">
          <button 
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1 || isCreating}
            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              step === 1 ? "opacity-0 pointer-events-none" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          {step < 3 ? (
            <button 
              onClick={() => {
                if (step === 1 && !name) return adminToast.error("Protocol identity required")
                setStep(step + 1)
              }}
              className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center gap-2 px-10 py-3 bg-primary text-primary-foreground rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendNow ? "Initiate Transmission" : "Command Scheduled"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
