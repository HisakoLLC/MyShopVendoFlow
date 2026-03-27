"use client"

import { useState, useMemo } from "react"
import { Search, MessageSquare, Clock, CheckCircle2, AlertCircle, User } from "lucide-react"
import ConversationView from "./ConversationView"

export type WhatsappConversation = {
  id: string
  contact_name: string | null
  contact_phone: string
  status: "open" | "pending" | "resolved"
  unread_count: number
  last_message_at: string | null
  merchant_id: string | null
  accounts?: {
    business_name: string
  }
}

interface WhatsappClientProps {
  initialConversations: WhatsappConversation[]
  merchantId?: string
}

export default function WhatsappClient({ initialConversations, merchantId }: WhatsappClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // Handle pre-selection from merchant detail page
  useState(() => {
    if (merchantId) {
      const match = initialConversations.find(c => c.merchant_id === merchantId)
      if (match) setSelectedId(match.id)
    }
  })

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "pending" | "resolved">("all")

  const filteredConversations = useMemo(() => {
    return initialConversations.filter((conv) => {
      const matchesSearch = 
        conv.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        conv.contact_phone.includes(search) ||
        conv.accounts?.business_name?.toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = filterStatus === "all" || conv.status === filterStatus
      
      return matchesSearch && matchesStatus
    })
  }, [initialConversations, search, filterStatus])

  const selectedConversation = useMemo(() => 
    initialConversations.find(c => c.id === selectedId),
  [initialConversations, selectedId])

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
        <div className="p-4 space-y-3 border-b border-[#1a1a1a]">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444] group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "open", "pending", "resolved"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  filterStatus === status 
                    ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" 
                    : "bg-white/5 text-[#444] border-transparent hover:text-[#666]"
                }`}
              >
                {status}
              </button>
            ))}
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
                  conv.status === 'pending' ? 'bg-amber-400' : 'bg-[#444]'
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
                <div className="text-[10px] text-[#22c55e] font-bold uppercase truncate mb-1">
                  {conv.accounts?.business_name}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] text-[#666] truncate pr-2 italic">
                    {conv.unread_count > 0 ? "New messages waiting..." : "Click to view chat"}
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

      {/* Right Panel: Chat View Placeholder */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] min-h-0">
        {selectedConversation ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat Header */}
            <div className="h-16 border-b border-[#1a1a1a] flex items-center px-6 justify-between bg-[#0d0d0d]/50 backdrop-blur-sm">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-[#161616] border border-[#1f1f1f] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#444]" />
                </div>
                <div>
                  <div className="text-sm text-white font-bold">{selectedConversation.contact_name || "Merchant"}</div>
                  <div className="text-[10px] text-[#666] flex items-center gap-1.5 uppercase font-black tracking-widest">
                    <span className="text-[#22c55e]">{selectedConversation.accounts?.business_name}</span>
                    <span>•</span>
                    <span>{selectedConversation.contact_phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-3 py-1.5 rounded border border-[#1f1f1f] text-[#444] text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all">
                  Resolve
                </button>
                <div className="w-px h-4 bg-[#1f1f1f]" />
                <button className="p-2 text-[#444] hover:text-white transition-colors">
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area - FORCED CONSTRAINT */}
            <div className="flex-1 relative min-h-0 bg-[#0a0a0a]">
              <div className="absolute inset-0">
                <ConversationView conversationId={selectedConversation.id} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 min-h-0">
            <div className="w-20 h-20 rounded-full bg-[#111] border border-[#1f1f1f] flex items-center justify-center shadow-inner">
              <MessageSquare className="w-10 h-10 text-[#1f1f1f]" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-white text-sm font-bold uppercase tracking-widest">Select a Merchant</h3>
              <p className="text-[#444] text-xs max-w-[240px] leading-relaxed italic">
                Choose a conversation from the left to start responding to merchant messages.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
