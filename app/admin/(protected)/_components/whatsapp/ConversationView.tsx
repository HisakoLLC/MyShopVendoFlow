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
  ShieldCheck,
  CheckCircle2,
  X
} from "lucide-react"
import { adminToast } from "@/lib/admin/toast"
import PermissionGate from "../PermissionGate"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  direction: "inbound" | "outbound"
  message_type: "text" | "template" | "system" | "image" | "document" | "video" | "audio" | "voice"
  content: any
  status: "sent" | "delivered" | "read" | "failed"
  created_at: string
  type?: "whatsapp_message" | "internal_note"
  author_name?: string
  template_name?: string | null
  template_params?: any
  media_url?: string | null
  mime_type?: string | null
  file_name?: string | null
  file_size?: number | null
}

interface Conversation {
  id: string
  contact_name: string | null
  contact_phone: string
  status: "open" | "waiting_customer" | "waiting_internal" | "resolved" | "escalated"
  assigned_agent_id: string | null
  last_message_at: string | null
  assigned_agent?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
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

export default function ConversationView({ 
  conversationId, 
  currentStatus, 
  assignedAgentId,
  onUpdateConversation
}: { 
  conversationId: string, 
  currentStatus?: string, 
  assignedAgentId?: string | null,
  onUpdateConversation?: (updates: any) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isInitial, setIsInitial] = useState(true)
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [showAgentList, setShowAgentList] = useState(false)
  const [showStatusList, setShowStatusList] = useState(false)
  
  const [activeTab, setActiveTab] = useState<"message" | "template">("message")
  const [inputMessage, setInputMessage] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({})
  const [preparedMedia, setPreparedMedia] = useState<{url: string, name: string, type: string, size: number} | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // 1. Fetch Chat History & Meta with Polling
  useEffect(() => {
    if (!conversationId) return
    
    let isMounted = true
    const fetchData = async () => {
      try {
        const [msgRes, convRes, usersRes] = await Promise.all([
          fetch(`/api/admin/whatsapp/messages?conversationId=${conversationId}`).then(res => res.json()),
          fetch(`/api/admin/whatsapp/conversation?conversationId=${conversationId}`).then(res => res.json()),
          fetch(`/api/admin/users`).then(res => res.json())
        ])

        if (isMounted) {
          if (msgRes.messages) setMessages(msgRes.messages)
          if (convRes.conversation) setConversation(convRes.conversation as Conversation)
          if (usersRes.users) setAdminUsers(usersRes.users)
          
          if (isInitial) {
            setLoading(false)
            scrollToBottom()
            setIsInitial(false)
          }
        }
      } catch (err) {
        console.error("Failed to fetch WhatsApp data:", err)
      }
    }

    fetchData()
    const pollInterval = setInterval(fetchData, 10000)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [conversationId, isInitial])

  const handleUpdateMeta = async (updates: { status?: string, assigned_agent_id?: string | null }) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/conversation?conversationId=${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error("Update failed")
      const { conversation: updated } = await res.json()
      setConversation(updated)
      onUpdateConversation?.(updates)
      adminToast.success("Conversation updated")
    } catch (err) {
      adminToast.error("Failed to update status")
    }
  }

  const isSessionExpired = () => {
    if (!conversation?.last_message_at) return false
    const lastMsg = new Date(conversation.last_message_at).getTime()
    const now = new Date().getTime()
    return (now - lastMsg) > 24 * 60 * 60 * 1000
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }

  const handleSend = async (mediaData?: { url: string, name: string, type: string, size: number }) => {
    if ((!inputMessage && activeTab === "message" && !mediaData) || isSending) return
    setIsSending(true)
    const toastId = adminToast.loading(isInternalNote ? "Saving Note..." : (mediaData ? "Sending Attachment..." : "Transmitting..."))

    try {
      const body: any = {
        conversationId,
        isInternalNote,
        type: mediaData ? (mediaData.type.includes("image") ? "image" : "document") : (activeTab === "message" ? "text" : "template"),
        content: inputMessage,
        templateName: selectedTemplate,
        templateParams: templateParams,
        mediaUrl: mediaData?.url,
        fileName: mediaData?.name,
        mimeType: mediaData?.type,
        fileSize: mediaData?.size
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
      setPreparedMedia(null)
      scrollToBottom()
    } catch (error) {
      console.error(error)
      adminToast.error("Transmission failed")
    } finally {
      adminToast.dismiss(toastId)
      setIsSending(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const toastId = adminToast.loading(`Uploading ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/admin/whatsapp/upload", {
        method: "POST",
        body: formData
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload failed")
      }

      const data = await res.json()
      
      const mediaData = {
        url: data.media_url,
        name: data.file_name,
        type: data.mime_type,
        size: data.file_size
      }

      if (activeTab === "template") {
         setPreparedMedia(mediaData)
      } else {
         // Now send the message with this media
         await handleSend(mediaData)
      }
    } catch (err: any) {
      adminToast.error(err.message)
    } finally {
      adminToast.dismiss(toastId)
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
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
      <div className="h-16 border-b border-[#1a1a1a] px-6 flex items-center justify-between bg-[#0d0d0d]/40">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => setShowStatusList(!showStatusList)}>
            <div className={`px-2 py-1 rounded border border-white/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-white/5 ${
               conversation?.status === 'resolved' ? 'text-zinc-500' : 'text-[#22c55e]'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                conversation?.status === 'open' ? 'bg-[#22c55e]' : 
                conversation?.status === 'resolved' ? 'bg-zinc-600' : 'bg-amber-500'
              }`} />
              {conversation?.status?.replace("_", " ")}
              <MoreVertical className="w-3 h-3 opacity-30" />
            </div>

            {showStatusList && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#111] border border-[#1f1f1f] rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                {(["open", "waiting_customer", "waiting_internal", "resolved", "escalated"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      handleUpdateMeta({ status: s })
                      setShowStatusList(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors ${conversation?.status === s ? 'text-[#22c55e]' : 'text-[#666]'}`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {conversation?.status !== 'resolved' && (
            <button
              onClick={() => handleUpdateMeta({ status: 'resolved' })}
              className="flex items-center gap-2 px-3 py-1 rounded bg-zinc-800 border border-white/5 text-[9px] font-black uppercase tracking-widest text-[#666] hover:text-white transition-all hover:bg-zinc-700"
              title="Resolve Chat"
            >
              <CheckCircle2 className="w-3 h-3" />
              Resolve Protocol
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <button 
              onClick={() => setShowAgentList(!showAgentList)}
              className="flex items-center gap-3 group px-3 py-1.5 rounded-md hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
            >
              <div className="text-right">
                <div className="text-[8px] text-[#444] uppercase font-black tracking-tighter">Assigned Agent</div>
                <div className="text-[10px] text-white/50 italic flex items-center gap-1.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-[#22c55e]/50" />
                  {conversation?.assigned_agent?.full_name || "Unassigned"}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#161616] border border-[#1f1f1f] flex items-center justify-center overflow-hidden">
                {conversation?.assigned_agent?.avatar_url ? (
                  <img src={conversation.assigned_agent.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-[#444]" />
                )}
              </div>
            </button>

            {showAgentList && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#111] border border-[#1f1f1f] rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                 <button
                    onClick={() => {
                      handleUpdateMeta({ assigned_agent_id: null })
                      setShowAgentList(false)
                    }}
                    className="w-full px-4 py-3 text-left border-b border-[#1a1a1a] text-[10px] font-black uppercase text-red-500/50 hover:bg-red-500/5"
                  >
                    Unassign Worker
                  </button>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {adminUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          handleUpdateMeta({ assigned_agent_id: u.id })
                          setShowAgentList(false)
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                      >
                         <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#1f1f1f] flex items-center justify-center text-[10px] text-white font-bold">
                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full" /> : u.full_name[0]}
                         </div>
                         <div className="text-left">
                           <div className="text-[10px] text-white/80 font-bold">{u.full_name}</div>
                           <div className="text-[8px] text-[#444] uppercase font-black tracking-widest">{u.role}</div>
                         </div>
                      </button>
                    ))}
                  </div>
              </div>
            )}
          </div>
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
                
                {msg.media_url && (
                   <div className="mb-2 max-w-xs mx-auto">
                     {msg.mime_type?.includes("image") ? (
                       <img src={msg.media_url} className="rounded border border-amber-400/20 w-full" alt="Attachment" />
                     ) : (
                       <a href={msg.media_url} target="_blank" className="flex items-center gap-2 p-2 rounded bg-amber-400/10 border border-amber-400/20 text-amber-200">
                         <FileText className="w-4 h-4" />
                         <span className="text-[10px] truncate">{msg.file_name || "Attachment"}</span>
                       </a>
                     )}
                   </div>
                )}

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
                  : "bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-tr-none text-white shadow-lg shadow-black/20"
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.message_type === "template" 
                    ? `[Template: ${msg.content?.template || msg.template_name || 'Generic'}]` 
                    : (typeof msg.content === 'string' ? msg.content : (msg.content?.text || msg.content?.body || ""))}
                </p>

                {msg.media_url && (
                  <div className="mt-2 group/media relative">
                    {msg.mime_type?.includes("image") ? (
                      <div className="relative rounded overflow-hidden border border-white/10 shadow-2xl">
                        <img src={msg.media_url} className="w-full h-auto max-h-[300px] object-cover transition-transform group-hover/media:scale-105 cursor-pointer" onClick={() => window.open(msg.media_url!, '_blank')} />
                        <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors" />
                      </div>
                    ) : (
                      <a 
                        href={msg.media_url} 
                        target="_blank" 
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          isInbound 
                            ? "bg-[#111] border-[#1f1f1f] hover:bg-[#1a1a1a]" 
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${isInbound ? "bg-zinc-800" : "bg-[#22c55e]/20"}`}>
                           <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="text-[11px] font-bold truncate">{msg.file_name || "Attachment"}</div>
                           <div className="text-[9px] opacity-40 uppercase font-black">{msg.mime_type?.split('/')[1] || "File"} • {(msg.file_size ? (msg.file_size / 1024).toFixed(1) : "?")} KB</div>
                        </div>
                      </a>
                    )}
                  </div>
                )}
                
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
      
      <div className="border-t border-[#1a1a1a] p-4 bg-[#0d0d0d] space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {isSessionExpired() && activeTab === 'message' && !isInternalNote && (
           <div className="p-3 rounded border border-amber-500/20 bg-amber-500/5 mb-2">
              <div className="flex items-center gap-3">
                 <AlertCircle className="w-4 h-4 text-amber-500" />
                 <div className="flex-1">
                    <p className="text-[10px] text-amber-500 font-black uppercase tracking_widest">24-Hour Session Expired</p>
                    <p className="text-[9px] text-amber-500/60 font-bold uppercase tracking-tighter">You must use an approved template to re-engage with this merchant.</p>
                 </div>
                 <button 
                  onClick={() => setActiveTab('template')}
                  className="px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase text-amber-500 hover:bg-amber-500/20"
                 >
                   Templates
                 </button>
              </div>
           </div>
        )}

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
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />

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
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || isUploading}
                    className="p-2 rounded-md hover:bg-white/5 text-[#444] hover:text-white transition-colors border border-transparent hover:border-white/5"
                    title="Attach File"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-[#22c55e]" /> : <Paperclip className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleSend()}
                    disabled={isSending || isUploading || (!inputMessage && activeTab === "message")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest transition-all ${
                      isSending || isUploading ? "bg-[#1a1a1a] text-[#444] opacity-50" : "bg-[#22c55e] text-white hover:bg-[#16a34a]"
                    }`}
                  >
                    {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Transmit
                  </button>
                </div>
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

                    <div className="pt-2 border-t border-[#1f1f1f]">
                       <div className="flex items-center gap-3">
                         <button
                           onClick={() => fileInputRef.current?.click()}
                           disabled={isUploading}
                           className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold text-[#666] hover:text-white transition-all border border-white/5"
                         >
                           {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                           Attach Document
                         </button>
                         {preparedMedia && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-1 rounded border border-[#22c55e]/20">
                               <FileText className="w-3 h-3" />
                               <span className="truncate max-w-[150px]">{preparedMedia.name}</span>
                               <button onClick={() => setPreparedMedia(null)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                            </div>
                         )}
                       </div>
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
                    onClick={() => handleSend(preparedMedia || undefined)}
                    disabled={isSending}
                    className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#22c55e] text-white font-bold text-[10px] uppercase tracking-widest hover:bg-[#16a34a] transition-all"
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
