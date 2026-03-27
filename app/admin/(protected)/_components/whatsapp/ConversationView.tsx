"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Send, 
  User, 
  Clock, 
  Check, 
  CheckCheck,
  AlertCircle,
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone,
  FileText,
  Loader2,
  Lock,
  Plus,
  ShieldCheck
} from "lucide-react"
import { adminToast } from "@/lib/admin/toast"
import PermissionGate from "../PermissionGate"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  direction: "inbound" | "outbound"
  message_type: "text" | "template" | "system" | "image"
  content: any
  status: "sent" | "delivered" | "read" | "failed"
  created_at: string
  type?: "whatsapp_message" | "internal_note"
  author_name?: string
  template_name?: string | null
  template_params?: any
}

interface Conversation {
  id: string
  contact_name: string | null
  contact_phone: string
  status: string
  accounts?: {
    business_name: string
  }
}

const TEMPLATES = [
  { id: "onboarding_message", name: "Onboarding Welcome", params: ["name"] },
  { id: "subscription_receipt", name: "Subscription Receipt", params: ["name"] },
  { id: "overdue_invoice_reminder", name: "Overdue Invoice", params: ["name", "invoice_id", "amount", "due_date"] },
  { id: "weekly_sales_report", name: "Weekly Sales Report", params: ["name", "start_date", "end_date"] },
  { id: "monthly_sales_report", name: "Monthly Sales Report", params: ["name", "month"] },
  { id: "daily_sales_report", name: "Daily Sales Report", params: ["name", "date"] },
]

export default function ConversationView({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  
  const [activeTab, setActiveTab] = useState<"message" | "template">("message")
  const [inputMessage, setInputMessage] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // 1. Fetch Chat History & Meta with Polling
  useEffect(() => {
    if (!conversationId) return
    
    let isMounted = true
    const fetchChat = async (isInitial = false) => {
      if (isInitial) setLoading(true)
      
      try {
        const [msgRes, convRes] = await Promise.all([
          fetch(`/api/admin/whatsapp/messages?conversationId=${conversationId}`).then(res => res.json()),
          fetch(`/api/admin/whatsapp/conversation?conversationId=${conversationId}`).then(res => res.json())
        ])

        if (isMounted) {
          if (msgRes.messages) setMessages(msgRes.messages)
          if (convRes.conversation) setConversation(convRes.conversation as Conversation)
          if (isInitial) {
            setLoading(false)
            scrollToBottom()
          }
        }
      } catch (err) {
        console.error("Fetch Error:", err)
        if (isMounted && isInitial) setLoading(false)
      }
    }

    fetchChat(true) // Initial load
    const interval = setInterval(() => fetchChat(false), 3000)

    // Optional Background Realtime
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        "postgres_changes", 
        { 
          event: "INSERT", 
          schema: "vendo_admin", 
          table: "whatsapp_messages", 
          filter: `conversation_id=eq.${conversationId}` 
        }, 
        () => fetchChat(false) // Just trigger a refresh on change
      )
      .subscribe()

    return () => { 
      isMounted = false
      clearInterval(interval)
      supabase.removeChannel(channel) 
    }
  }, [conversationId])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }

  const handleSend = async () => {
    if ((!inputMessage && activeTab === "message") || isSending) return
    setIsSending(true)
    const toastId = adminToast.loading(isInternalNote ? "Saving Note..." : "Transmitting...")

    try {
      const body: any = {
        conversationId,
        isInternalNote,
        type: activeTab === "message" ? "text" : "template",
        content: inputMessage,
        templateName: selectedTemplate,
        templateParams: templateParams
      }

      const res = await fetch("/api/admin/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error("Failed to send message")

      adminToast.success(isInternalNote ? "Internal note saved" : "Message transmitted")
      setInputMessage("")
      setIsInternalNote(false)
      setTemplateParams({})
      setSelectedTemplate("")
      scrollToBottom()
    } catch (error) {
      console.error(error)
      adminToast.error("Transmission failed")
    } finally {
      adminToast.dismiss(toastId)
      setIsSending(false)
    }
  }

  const formatTimestamp = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
          <div className="text-[10px] text-[#444] font-black uppercase tracking-[0.2em]">Loading Conversation...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="h-16 border-b border-[#1a1a1a] px-6 flex items-center justify-between bg-[#0d0d0d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#161616] border border-[#1f1f1f] flex items-center justify-center font-bold text-white uppercase italic">
            {conversation?.contact_name?.[0] || "M"}
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              {conversation?.contact_name || conversation?.contact_phone}
              <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-tighter ${
                conversation?.status === 'open' ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-zinc-500/10 text-zinc-500'
              }`}>
                {conversation?.status}
              </span>
            </div>
            <div className="text-[10px] text-[#666] flex items-center gap-2 uppercase tracking-widest font-black">
              <span className="text-[#22c55e]">{conversation?.accounts?.business_name}</span>
              <span>•</span>
              <span>{conversation?.contact_phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[9px] text-[#444] uppercase font-bold tracking-tighter">Assigned Agent</div>
            <div className="text-[10px] text-white/50 italic flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              Super Admin
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-md bg-[#161616] border border-[#1f1f1f] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
            Resolve
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#0a0a0a]"
      >
        {messages.map((msg) => {
          if (msg.type === "internal_note" || msg.message_type === "system") {
            return (
              <div key={msg.id} className="mx-12 py-3 px-4 rounded-lg bg-amber-400/5 border border-amber-400/20 text-center ring-1 ring-amber-400/10">
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-[0.2em] block mb-1">
                  📝 Internal Note {msg.author_name ? `• ${msg.author_name}` : ""}
                </span>
                <p className="text-xs text-amber-200/70 italic leading-relaxed">
                  {typeof msg.content === 'string' ? msg.content : (msg.content?.text || msg.content?.body || JSON.stringify(msg.content))}
                </p>
                <span className="text-[9px] text-amber-200/30 font-mono mt-2 block">{formatTimestamp(msg.created_at)}</span>
              </div>
            )
          }

          const isInbound = msg.direction === "inbound"
          return (
            <div key={msg.id} className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}>
              {msg.message_type === "template" && (
                <div className="text-[9px] font-black uppercase tracking-widest text-[#22c55e] mb-1 px-1">Meta Template</div>
              )}
              <div className={`max-w-[70%] p-3 px-4 rounded-2xl relative group ${
                isInbound 
                  ? "bg-[#161616] border border-[#1f1f1f] rounded-tl-none text-[#ddd]" 
                  : "bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-tr-none text-white text-shadow-sm shadow-2xl shadow-[#22c55e]/5"
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.message_type === "template" 
                    ? `[Template: ${msg.content?.template || msg.template_name || 'Generic'}]` 
                    : (typeof msg.content === 'string' ? msg.content : (msg.content?.text || msg.content?.body || ""))}
                </p>
                
                <div className={`mt-1.5 flex items-center gap-1.5 ${isInbound ? "text-[#444]" : "text-white/30"}`}>
                  <span className="text-[9px] font-mono">{formatTimestamp(msg.created_at)}</span>
                  {!isInbound && (
                    <span className="w-3 h-3">
                      {msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-400" /> : 
                       msg.status === 'delivered' ? <CheckCheck className="w-3 h-3" /> : 
                       msg.status === 'failed' ? <AlertCircle className="w-3 h-3 text-red-500" /> : <Check className="w-3 h-3" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-20">
            <Clock className="w-8 h-8 text-[#444]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444] text-center max-w-[200px]">
              No messages yet. Send the first message below.
            </p>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[#1a1a1a] p-4 bg-[#0d0d0d] space-y-4 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.5)]">
        <PermissionGate 
          permission="whatsapp_send"
          fallback={
            <div className="bg-[#0d0d0d] p-6 text-center border-t border-[#1f1f1f]">
               <div className="flex flex-col items-center gap-2 text-[#444]">
                  <Lock className="w-5 h-5 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Communication Restricted</p>
               </div>
            </div>
          }
        >
          {/* Composer Tabs */}
          <div className="flex gap-4 border-b border-[#1f1f1f] mb-2 px-1">
            {["message", "template"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                  activeTab === tab ? "text-white" : "text-[#444] hover:text-[#666]"
                }`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
              </button>
            ))}
          </div>

          {activeTab === "message" ? (
            <div className="space-y-3">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isInternalNote ? "Write private administrative note..." : "Compose high-fidelity message..."}
                className={`w-full bg-[#111] border rounded-lg p-3 text-sm text-white focus:outline-none transition-all resize-none h-24 ${
                  isInternalNote ? "border-amber-400/40 focus:border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.05)]" : "border-[#1f1f1f] focus:border-[#22c55e]"
                }`}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="hidden"
                  />
                  <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors ${
                    isInternalNote ? "border-amber-400 bg-amber-400" : "border-[#444] group-hover:border-white"
                  }`}>
                    {isInternalNote && <Check className="w-2.5 h-2.5 text-black" />}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    isInternalNote ? "text-amber-400" : "text-[#444]"
                  }`}>Internal Note</span>
                </label>
                
                <button
                  onClick={handleSend}
                  disabled={isSending || !inputMessage}
                  className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest transition-all ${
                    isSending ? "bg-[#1a1a1a] text-[#444] opacity-50" : "bg-[#22c55e] text-black hover:bg-[#1eb054]"
                  }`}
                >
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Transmit Message
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#444] uppercase font-black">Template Pipeline</label>
                  <select 
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value)
                      setTemplateParams({})
                    }}
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#22c55e]"
                  >
                    <option value="">Select an approved template...</option>
                    {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {selectedTemplate && (
                 <div className="space-y-3">
                   <label className="text-[9px] text-[#444] uppercase font-black">Parameter Injection</label>
                   <div className="grid grid-cols-2 gap-2">
                     {TEMPLATES.find(t => t.id === selectedTemplate)?.params.map(p => (
                       <input
                         key={p}
                         type="text"
                         placeholder={`Param: ${p}`}
                         value={templateParams[p] || ""}
                         onChange={(e) => setTemplateParams(prev => ({ ...prev, [p]: e.target.value }))}
                         className="bg-[#111] border border-[#1f1f1f] rounded p-2 text-[10px] text-white focus:border-[#22c55e] outline-none"
                       />
                     ))}
                   </div>
                 </div>
                )}
              </div>

              {selectedTemplate && (
                <div className="bg-[#161616] border border-[#1f1f1f] rounded-lg p-3 flex justify-between items-center group">
                  <div className="flex-1">
                     <div className="text-[8px] text-[#444] font-black uppercase tracking-[0.2em] mb-1">Preview Protocol</div>
                     <div className="text-[10px] text-[#666] italic">
                       Template `{selectedTemplate}` will be populated with {Object.keys(templateParams).length} parameters.
                     </div>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={isSending}
                    className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#22c55e] text-black font-bold text-[10px] uppercase tracking-widest hover:bg-[#1eb054] transition-all"
                  >
                    Execute
                    {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </PermissionGate>
      </div>
    </div>
  )
}
