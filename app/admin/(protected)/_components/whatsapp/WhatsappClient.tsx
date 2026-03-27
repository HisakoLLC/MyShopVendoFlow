"use client"

import { useState, useMemo } from "react"
import { Search, MessageSquare, Clock, CheckCircle2, AlertCircle, User, ChevronRight, ChevronDown, Filter, Plus, X, Loader2, Send } from "lucide-react"
import ConversationView from "./ConversationView"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import { adminToast } from "@/lib/admin/toast"

export type WhatsappConversation = {
  id: string
  contact_name: string | null
  contact_phone: string
  status: "open" | "waiting_customer" | "waiting_internal" | "resolved" | "escalated"
  unread_count: number
  last_message_at: string | null
  last_message_content?: string | null
  merchant_id: string | null
  assigned_agent_id: string | null
  assigned_agent?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  accounts?: {
    business_name: string
  }
}

interface WhatsappClientProps {
  initialConversations: WhatsappConversation[]
  merchantId?: string
  merchants?: { account_id: string, business_name: string }[]
}

export default function WhatsappClient({ initialConversations, merchantId, merchants = [] }: WhatsappClientProps) {
  const [conversations, setConversations] = useState<WhatsappConversation[]>(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [newChatPhone, setNewChatPhone] = useState("")
  const [newChatMerchant, setNewChatMerchant] = useState("")
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  
  // Handle pre-selection from merchant detail page
  useState(() => {
    if (merchantId) {
      const match = initialConversations.find(c => c.merchant_id === merchantId)
      if (match) setSelectedId(match.id)
    }
  })

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<WhatsappConversation["status"] | "all">("all")
  const [filterAgent, setFilterAgent] = useState<"all" | "me" | "unassigned">("all")
  const [isContextOpen, setIsContextOpen] = useState(true)
  const [merchantContext, setMerchantContext] = useState<any>(null)
  const [loadingContext, setLoadingContext] = useState(false)

  const adminUser = useAdminUser()

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchesSearch = 
        conv.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        conv.contact_phone.includes(search) ||
        conv.accounts?.business_name?.toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = filterStatus === "all" || (conv.status as string) === filterStatus
      
      let matchesAgent = true
      if (filterAgent === "me") matchesAgent = conv.assigned_agent_id === adminUser.id
      if (filterAgent === "unassigned") matchesAgent = !conv.assigned_agent_id
      
      return matchesSearch && matchesStatus && matchesAgent
    })
  }, [conversations, search, filterStatus, filterAgent, adminUser.id])

  const selectedConversation = useMemo(() => 
    conversations.find(c => c.id === selectedId),
  [conversations, selectedId])

  const handleUpdateLocalConversation = (id: string, updates: Partial<WhatsappConversation>) => {
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ))
  }

  const handleCreateChat = async () => {
    if (!newChatPhone) return
    setIsCreatingChat(true)
    const toastId = adminToast.loading("Initializing Protocol...")

    try {
      const res = await fetch("/api/admin/whatsapp/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: newChatPhone, 
          merchantId: newChatMerchant 
        })
      })

      if (!res.ok) throw new Error("Failed to create conversation")
      const { conversation: newConv, isNew } = await res.json()

      // Add to list if not there
      setConversations(prev => {
        const exists = prev.find(c => c.id === newConv.id)
        if (exists) return prev
        const mapped = {
          ...newConv,
          accounts: {
            business_name: merchants.find(m => m.account_id === newConv.merchant_id)?.business_name || "New Merchant"
          }
        }
        return [mapped, ...prev]
      })

      setSelectedId(newConv.id)
      setIsNewChatOpen(false)
      setNewChatPhone("")
      setNewChatMerchant("")
      adminToast.success(isNew ? "New secure channel established" : "Connected to existing channel")
    } catch (err) {
      adminToast.error("Handshake failed")
    } finally {
      adminToast.dismiss(toastId)
      setIsCreatingChat(false)
    }
  }

  // Fetch Merchant Context
  useState(() => {
    if (selectedConversation?.merchant_id) {
       setLoadingContext(true)
       fetch(`/api/admin/whatsapp/merchant-context?merchantId=${selectedConversation.merchant_id}`)
         .then(res => res.json())
         .then(data => {
           setMerchantContext(data.merchant)
           setLoadingContext(false)
         })
         .catch(() => setLoadingContext(false))
    } else {
       setMerchantContext(null)
    }
  })

  // Re-fetch when selection changes
  useMemo(() => {
    if (selectedConversation?.merchant_id) {
       setLoadingContext(true)
       fetch(`/api/admin/whatsapp/merchant-context?merchantId=${selectedConversation.merchant_id}`)
         .then(res => res.json())
         .then(data => {
           setMerchantContext(data.merchant)
           setLoadingContext(false)
         })
         .catch(() => setLoadingContext(false))
    } else {
       setMerchantContext(null)
    }
  }, [selectedConversation?.merchant_id])

  const formatTime = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-[#0a0a0a]">
      {/* Left Panel: Conversation List */}
      <div className="w-80 border-r border-[#1a1a1a] flex flex-col bg-[#0d0d0d]">
        {/* Search & Filters */}
        <div className="p-4 space-y-4 border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="flex items-center gap-2">
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444] group-focus-within:text-[#22c55e] transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#111] border border-[#1f1f1f] rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#22c55e]/50 transition-colors"
              />
            </div>
            <button 
              onClick={() => setIsNewChatOpen(true)}
              className="p-1.5 rounded bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 transition-all border border-[#22c55e]/20"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-[#111] border border-[#1f1f1f] rounded-md pl-3 pr-8 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#666] appearance-none focus:outline-none focus:border-[#22c55e]/50 transition-colors cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="waiting_customer">Waiting Customer</option>
                <option value="waiting_internal">Waiting Internal</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#444] pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value as any)}
                className="w-full bg-[#111] border border-[#1f1f1f] rounded-md pl-3 pr-8 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#666] appearance-none focus:outline-none focus:border-[#22c55e]/50 transition-colors cursor-pointer"
              >
                <option value="all">All Agents</option>
                <option value="me">Assigned to Me</option>
                <option value="unassigned">Unassigned</option>
              </select>
              <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#444] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`px-4 py-3 border-b border-[#1a1a1a] cursor-pointer transition-all relative flex gap-3 items-start ${
                selectedId === conv.id 
                  ? "bg-[#161616] border-l-2 border-[#22c55e]" 
                  : "bg-transparent hover:bg-[#111]"
              }`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#1f1f1f]">
                  <MessageSquare className="w-5 h-5 text-[#444]" />
                </div>
                {/* Status Dot */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d0d] ${
                  conv.status === 'open' ? 'bg-[#22c55e]' : 
                  conv.status === 'resolved' ? 'bg-zinc-600' : 'bg-amber-500'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="text-sm font-medium text-white truncate">
                    {conv.contact_name || conv.contact_phone}
                  </span>
                  <span className="text-[10px] text-[#444] font-medium shrink-0">
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="text-[10px] text-[#22c55e] font-bold uppercase truncate mb-1 flex items-center gap-1.5">
                  <span className="truncate">{conv.accounts?.business_name}</span>
                  {conv.assigned_agent && (
                    <>
                      <span className="text-[#222]">/</span>
                      <span className="text-[#666] tracking-tighter normal-case font-medium">@{conv.assigned_agent.full_name.split(' ')[0]}</span>
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] text-[#555] truncate pr-2 italic">
                    {conv.last_message_content || "No message history"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="bg-[#22c55e] text-black text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center animate-pulse">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center space-y-2 opacity-50">
               <div className="w-10 h-10 rounded-full bg-[#111] border border-[#1f1f1f] mx-auto flex items-center justify-center">
                <Search className="w-5 h-5 text-[#444]" />
               </div>
               <p className="text-[#444] text-xs underline decoration-dotted">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panels: Chat + Context */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col bg-[#0a0a0a] min-h-0 border-r border-[#1a1a1a]">
          {selectedConversation ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Chat Header */}
              <div className="h-16 border-b border-[#1a1a1a] flex items-center px-6 justify-between bg-[#0d0d0d]/30 backdrop-blur-md">
                <div className="flex gap-4 items-center">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#161616] border border-[#1f1f1f] flex items-center justify-center ring-1 ring-white/5">
                      <User className="w-5 h-5 text-[#444]" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${
                      selectedConversation.status === 'open' ? 'bg-[#22c55e]' : 
                      selectedConversation.status === 'resolved' ? 'bg-zinc-600' : 'bg-amber-500'
                    }`} />
                  </div>
                  <div>
                    <div className="text-sm text-white font-black tracking-tight">{selectedConversation.contact_name || "Merchant"}</div>
                    <div className="text-[10px] text-[#666] flex items-center gap-2 uppercase font-black tracking-widest mt-0.5">
                      <span className="text-[#22c55e]/80">{selectedConversation.accounts?.business_name}</span>
                      <span className="text-[#333]">|</span>
                      <span>{selectedConversation.contact_phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-[#666]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                    {selectedConversation.status.replace("_", " ")}
                  </div>
                  <button 
                    onClick={() => setIsContextOpen(!isContextOpen)}
                    className={`p-2 rounded-full transition-all ${isContextOpen ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'text-[#444] hover:text-white'}`}
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-[#1a1a1a]" />
                  <button className="p-2 text-[#444] hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 relative min-h-0 bg-[#0a0a0a]">
                <div className="absolute inset-0">
                  <ConversationView 
                    conversationId={selectedConversation.id} 
                    currentStatus={selectedConversation.status}
                    assignedAgentId={selectedConversation.assigned_agent_id}
                    onUpdateConversation={(updates: any) => handleUpdateLocalConversation(selectedConversation.id, updates)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-6 min-h-0 bg-[radial-gradient(circle_at_center,_#0d0d0d_0%,_#0a0a0a_100%)]">
              <div className="w-24 h-24 rounded-full bg-[#111] border border-[#1f1f1f] flex items-center justify-center shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#22c55e]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <MessageSquare className="w-10 h-10 text-[#222]" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-white text-xs font-black uppercase tracking-[0.3em]">Support Command Center</h3>
                <p className="text-[#444] text-[10px] max-w-[280px] leading-relaxed uppercase font-bold tracking-wider">
                  Select a secure communication channel to begin responding to high-priority merchant requests.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Context Panel */}
        {selectedConversation && (
          <div className={`bg-[#0d0d0d] border-l border-[#1a1a1a] transition-all duration-300 overflow-hidden ${isContextOpen ? 'w-80' : 'w-0'}`}>
            <div className="w-80 h-full flex flex-col min-h-0">
              <div className="p-6 border-b border-[#1a1a1a]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#444] mb-4">Customer Context</h3>
                <div className="space-y-6">
                   <div className="space-y-1">
                      <div className="text-[#666] text-[9px] font-black uppercase tracking-tighter">Merchant Info</div>
                      <div className="text-white text-sm font-bold">{selectedConversation.accounts?.business_name}</div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded bg-white/5 border border-white/5">
                        <div className="text-[#444] text-[8px] font-black uppercase">Revenue</div>
                        <div className="text-white text-xs font-bold font-mono">
                          {loadingContext ? "..." : `KES ${merchantContext?.totalRevenue?.toLocaleString() || "0"}`}
                        </div>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/5">
                        <div className="text-[#444] text-[8px] font-black uppercase">Orders</div>
                        <div className="text-white text-xs font-bold font-mono">
                          {loadingContext ? "..." : (merchantContext?.orderCount || "0")}
                        </div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="text-[#666] text-[9px] font-black uppercase tracking-tighter">Last Activity</div>
                      <div className="text-[10px] text-white/70 italic flex items-center gap-2">
                         <div className="w-1 h-1 rounded-full bg-[#22c55e]" />
                         {loadingContext ? "Checking..." : `Plan: ${merchantContext?.plan_tier?.toUpperCase() || "N/A"}`}
                      </div>
                      <div className="text-[9px] text-[#444] font-bold uppercase tracking-widest pl-3">
                         {merchantContext?.subscription_status || "Inactive"}
                      </div>
                   </div>
                </div>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#444] mb-4">Risk Flags</h3>
                <div className="p-3 rounded border border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-500/80 font-bold uppercase tracking-wider text-center">
                   No immediate risk detected
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <NewChatModal 
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onCreate={handleCreateChat}
        isCreating={isCreatingChat}
        newPhone={newChatPhone}
        setNewPhone={setNewChatPhone}
        newMerchant={newChatMerchant}
        setNewMerchant={setNewChatMerchant}
        merchants={merchants}
      />
    </div>
  )
}

function NewChatModal({ 
  isOpen, 
  onClose, 
  onCreate, 
  isCreating,
  newPhone,
  setNewPhone,
  newMerchant,
  setNewMerchant,
  merchants 
}: {
  isOpen: boolean
  onClose: () => void
  onCreate: () => void
  isCreating: boolean
  newPhone: string
  setNewPhone: (v: string) => void
  newMerchant: string
  setNewMerchant: (v: string) => void
  merchants: { account_id: string, business_name: string }[]
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#22c55e]">Initiate Output</h3>
            <p className="text-[10px] text-[#444] font-bold uppercase">Establish new secure channel</p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] text-[#444] uppercase font-black">Recipient Phone (E.164)</label>
            <input
              type="text"
              placeholder="+254..."
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] text-[#444] uppercase font-black">Link to Merchant</label>
            <select
              value={newMerchant}
              onChange={(e) => setNewMerchant(e.target.value)}
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all"
            >
              <option value="">Select Merchant (Optional)</option>
              {merchants.map(m => (
                <option key={m.account_id} value={m.account_id}>{m.business_name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={onCreate}
          disabled={isCreating || !newPhone}
          className="w-full bg-[#22c55e] text-white py-3 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#16a34a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Open Channel
        </button>
      </div>
    </div>
  )
}
