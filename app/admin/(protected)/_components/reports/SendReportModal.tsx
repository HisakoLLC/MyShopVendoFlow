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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#22c55e]" />
            <h2 className="text-white font-bold tracking-tight">Send via WhatsApp</h2>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress */}
        <div className="px-6 py-4 flex gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${step >= i ? "bg-[#22c55e]" : "bg-[#1f1f1f]"}`} />
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">Select Recipients</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                  <input 
                    type="text"
                    placeholder="Search contacts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#666] uppercase font-bold tracking-widest">{filtered.length} Contacts found</span>
                  <button 
                    onClick={toggleAll}
                    className="text-[10px] text-[#22c55e] font-black uppercase tracking-widest hover:underline"
                  >
                    {selectedIds.length === filtered.length ? "Deselect All" : "Select All for Merchant"}
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-[#22c55e] animate-spin" /></div>
                  ) : filtered.map(convo => (
                    <button
                      key={convo.id}
                      onClick={() => setSelectedIds(ids => ids.includes(convo.id) ? ids.filter(i => i !== convo.id) : [...ids, convo.id])}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        selectedIds.includes(convo.id) 
                          ? "bg-[#22c55e]/5 border-[#22c55e] text-white" 
                          : "bg-white/5 border-[#1f1f1f] text-[#444] hover:border-[#333]"
                      }`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedIds.includes(convo.id) ? "bg-[#22c55e] text-black" : "bg-white/5 text-[#444]"}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold leading-none mb-1 ${selectedIds.includes(convo.id) ? "text-white" : "text-[#888]"}`}>{convo.contact_name}</p>
                          <p className="text-[10px] text-[#444]">{convo.contact_phone}</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedIds.includes(convo.id) ? "bg-[#22c55e] border-[#22c55e]" : "border-[#1f1f1f]"}`}>
                        {selectedIds.includes(convo.id) && <Check className="w-2.5 h-2.5 text-black" />}
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
                 <div className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">Template Preview</div>
                 <div className="p-5 rounded-2xl bg-[#111] border border-[#1f1f1f] border-dashed space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e] text-[8px] font-black uppercase tracking-widest border border-[#22c55e]/20">
                         {report.report_type}_sales_report
                       </span>
                       <span className="text-[9px] text-[#444] font-bold uppercase tracking-widest">WhatsApp Template</span>
                    </div>
                    <p className="text-sm text-[#888] italic leading-relaxed">
                       "{getTemplatePreview()}"
                    </p>
                 </div>
               </div>

               <div className="space-y-4">
                  <div className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">Recipients Summary</div>
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-[#22c55e]/5 border border-[#22c55e]/10">
                     <Users className="w-5 h-5 text-[#22c55e]" />
                     <p className="text-xs text-white">This report will be sent to <span className="font-bold">{selectedIds.length}</span> individual contacts.</p>
                  </div>
               </div>
            </div>
          )}

          {step === 3 && results && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 py-10 text-center">
               <div className="w-16 h-16 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#22c55e]" />
               </div>
               <div className="space-y-2">
                  <h3 className="text-white text-xl font-bold tracking-tight">Distribution Complete</h3>
                  <p className="text-sm text-[#666]">{results.summary}</p>
               </div>
               
               <div className="space-y-2 pt-4">
                  {results.results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 text-[10px]">
                       <span className="text-[#888]">{r.conversationId}</span>
                       {r.status === "success" 
                         ? <span className="text-[#22c55e] font-black">SENT</span>
                         : <span className="text-red-400 font-black">FAILED</span>
                       }
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1f1f1f] flex gap-3">
          {step < 3 && (
            <button
              onClick={step === 1 ? onClose : () => setStep(1)}
              className="flex-1 py-3 rounded-xl border border-[#1f1f1f] text-[10px] font-black uppercase tracking-widest text-[#444] hover:text-white transition-all capitalize"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
          )}

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={selectedIds.length === 0}
              className="flex-2 py-3 bg-[#22c55e] text-black rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              Continue to Preview
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex-2 py-3 bg-[#22c55e] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-[#22c55e]/10 transition-all flex items-center justify-center gap-2"
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
              className="w-full py-3 bg-white/5 border border-[#1f1f1f] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Close Distribution Tool
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
