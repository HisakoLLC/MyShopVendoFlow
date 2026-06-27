"use client"

import { useState, useEffect } from "react"
import { 
  X, 
  Search, 
  Check, 
  ChevronRight, 
  MessageSquare, 
  User, 
  Loader2, 
  Send,
  AlertCircle,
  Users,
  ArrowRight
} from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface SendReportModalProps {
  report: any
  onClose: () => void
  onSuccess: () => void
}

export default function SendReportModal({ report, onClose, onSuccess }: SendReportModalProps) {
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<{ summary: string, results: any[] } | null>(null)

  useEffect(() => {
    async function fetchConvos() {
      try {
        const res = await fetch(`/api/admin/whatsapp/conversations?merchantId=${report.merchant_id}`)
        const data = await res.json()
        setConversations(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchConvos()
  }, [report.merchant_id])

  const filtered = conversations.filter(c => 
    c.contact_name?.toLowerCase().includes(search.toLowerCase()) || 
    c.contact_phone?.includes(search)
  )

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(c => c.id))
    }
  }

  const handleSend = async () => {
    setIsSending(true)
    const toastId = adminToast.loading("Initiating batch delivery...")
    try {
      const res = await fetch(`/api/admin/reports/${report.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientConversationIds: selectedIds })
      })
      const data = await res.json()
      setResults(data)
      const successCount = data.results.filter((r: any) => r.status === 'success').length
      adminToast.success(`Sent to ${successCount} recipients`)
      setStep(3)
      onSuccess()
    } catch (err) {
      console.error(err)
      adminToast.error("Batch delivery error")
    } finally {
      adminToast.dismiss(toastId)
      setIsSending(false)
    }
  }

  const getTemplatePreview = () => {
    const dateStr = new Date(report.period_start).toLocaleDateString("en-GB")
    if (report.report_type === "daily") {
      return `Hi [Name], here is your Daily Sales Report for ${dateStr}. Revenue: KES ${report.data.summary.total_revenue.toLocaleString()}.`
    }
    if (report.report_type === "weekly") {
      return `Hi [Name], your Weekly Performance Report (${dateStr} - ${new Date(report.period_end).toLocaleDateString("en-GB")}) is ready.`
    }
    return `Hi [Name], the Monthly Analytics for ${new Date(report.period_start).toLocaleString('default', { month: 'long' })} has been generated.`
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4 font-sans">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#E8400C]" />
            <h2 className="text-foreground font-bold tracking-tight">Send via WhatsApp</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress */}
        <div className="px-6 py-4 flex gap-1 bg-background">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${step >= i ? "bg-[#E8400C]" : "bg-muted"}`} />
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Select Recipients</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text"
                    placeholder="Search contacts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground/40 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{filtered.length} Contacts found</span>
                  <button 
                    onClick={toggleAll}
                    className="text-[10px] text-[#E8400C] font-bold uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    {selectedIds.length === filtered.length ? "Deselect All" : "Select All for Merchant"}
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-[#E8400C] animate-spin" /></div>
                  ) : filtered.map(convo => (
                    <button
                      key={convo.id}
                      onClick={() => setSelectedIds(ids => ids.includes(convo.id) ? ids.filter(i => i !== convo.id) : [...ids, convo.id])}
                      className={`w-full flex items-center justify-between p-3 rounded-md border transition-all cursor-pointer ${
                        selectedIds.includes(convo.id) 
                          ? "bg-accent border-[#E8400C] text-foreground shadow-sm" 
                          : "bg-background border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedIds.includes(convo.id) ? "bg-[#E8400C] text-white" : "bg-muted text-muted-foreground"}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold leading-none mb-1 ${selectedIds.includes(convo.id) ? "text-foreground" : "text-muted-foreground"}`}>{convo.contact_name}</p>
                          <p className="text-[10px] text-muted-foreground/80">{convo.contact_phone}</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedIds.includes(convo.id) ? "bg-[#E8400C] border-[#E8400C]" : "border-border"}`}>
                        {selectedIds.includes(convo.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                 <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Template Preview</div>
                 <div className="p-5 rounded-md bg-muted/40 border border-border border-dashed space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="px-1.5 py-0.5 rounded bg-[#E8400C]/10 text-[#E8400C] text-[9px] font-bold uppercase tracking-wider border border-[#E8400C]/20">
                         {report.report_type}_sales_report
                       </span>
                       <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">WhatsApp Template</span>
                    </div>
                    <p className="text-sm text-foreground italic leading-relaxed">
                       "{getTemplatePreview()}"
                    </p>
                 </div>
               </div>

               <div className="space-y-4">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Recipients Summary</div>
                  <div className="flex items-center gap-2 p-4 rounded-md bg-[#E8400C]/10 border border-[#E8400C]/20">
                     <Users className="w-5 h-5 text-[#E8400C]" />
                     <p className="text-xs text-foreground">This report will be sent to <span className="font-bold">{selectedIds.length}</span> individual contacts.</p>
                  </div>
               </div>
            </div>
          )}

          {step === 3 && results && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 py-10 text-center">
               <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-500" />
               </div>
               <div className="space-y-2">
                  <h3 className="text-foreground text-xl font-bold tracking-tight">Distribution Complete</h3>
                  <p className="text-sm text-muted-foreground">{results.summary}</p>
               </div>
               
               <div className="space-y-2 pt-4">
                  {results.results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/40 text-[10px] font-mono">
                       <span className="text-muted-foreground">{r.conversationId}</span>
                       {r.status === "success" 
                         ? <span className="text-emerald-500 font-bold">SENT</span>
                         : <span className="text-destructive font-bold">FAILED</span>
                       }
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/40 flex gap-3">
          {step < 3 && (
            <button
              onClick={step === 1 ? onClose : () => setStep(1)}
              className="flex-1 py-2.5 rounded-md border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
          )}

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={selectedIds.length === 0}
              className="flex-2 py-2.5 bg-[#E8400C] text-white rounded-md text-xs font-semibold uppercase tracking-wider disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:bg-[#c73508] cursor-pointer shadow-sm"
            >
              Continue to Preview
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex-2 py-2.5 bg-[#E8400C] text-white rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-[#c73508] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Batch...
                </>
              ) : (
                <>
                  Send to {selectedIds.length} Recipients
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-background border border-border text-foreground rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-accent transition-all cursor-pointer"
            >
              Close Distribution Tool
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
