"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, MessageSquare, Clock, CheckCircle2, AlertCircle, User, ChevronRight, ChevronDown, Filter, Plus, X, Loader2, Send, LayoutDashboard, Radio } from "lucide-react"
import ConversationView from "./ConversationView"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import { adminToast } from "@/lib/admin/toast"
import { RecordPaymentModal } from "../merchants/billing/RecordPaymentModal"
import Link from "next/link"
import { Shield, CreditCard, FileText, Zap, Crown, AlertTriangle, Key } from "lucide-react"
import BroadcastsTab from "./BroadcastsTab"
import AnalyticsTab from "./AnalyticsTab"

type Tab = "conversations" | "templates" | "broadcasts" | "analytics"

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
  tags?: string[] | null
  notes?: string | null
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
  const [activeTab, setActiveTab] = useState<Tab>("conversations")
  
  // Handle pre-selection from merchant detail page
  useEffect(() => {
    if (merchantId) {
      const match = initialConversations.find(c => c.merchant_id === merchantId)
      if (match) setSelectedId(match.id)
    }
  }, [merchantId, initialConversations])

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<WhatsappConversation["status"] | "all">("all")
  const [filterAgent, setFilterAgent] = useState<"all" | "me" | "unassigned">("all")
  const [isContextOpen, setIsContextOpen] = useState(true)
  const [merchantContext, setMerchantContext] = useState<any>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState("")
  const [newTag, setNewTag] = useState("")
  const [isSavingContext, setIsSavingContext] = useState(false)
  
  // Billing & Actions States
  const [billingData, setBillingData] = useState<any>(null)
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [loadingBilling, setLoadingBilling] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [linkingMerchant, setLinkingMerchant] = useState(false)

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

  const handleUpdateContext = async (id: string, updates: Partial<WhatsappConversation>) => {
    setIsSavingContext(true)
    try {
      const res = await fetch(`/api/admin/whatsapp/conversation?conversationId=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error("Update failed")
      handleUpdateLocalConversation(id, updates)
      adminToast.success("Context synchronized")
    } catch (err) {
      adminToast.error("Handshake failed")
    } finally {
      setIsSavingContext(false)
    }
  }

  const handleAddTag = (id: string, tag: string) => {
    if (!tag) return
    const currentTags = conversations.find(c => c.id === id)?.tags || []
    if (!currentTags.includes(tag)) {
      handleUpdateContext(id, { tags: [...currentTags, tag] })
      setNewTag("")
    }
  }

  const handleRemoveTag = (id: string, tag: string) => {
    const currentTags = conversations.find(c => c.id === id)?.tags || []
    handleUpdateContext(id, { tags: currentTags.filter(t => t !== tag) })
  }

  const handleToggleFlag = async (type: 'vip' | 'at_risk', enabled: boolean) => {
    if (!selectedConversation?.merchant_id) return
    const id = selectedConversation.merchant_id
    setActionLoading(type)
    try {
      const res = await fetch(`/api/admin/accounts/${id}/toggle-flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: type, enabled })
      })
      if (!res.ok) throw new Error("Toggle failed")
      
      // Update local billing data if cached
      setBillingData((prev: any) => {
        if (!prev) return prev
        const newFlags = [...(prev.flags || [])]
        const idx = newFlags.findIndex(f => (type === 'vip' ? f.is_vip : f.is_at_risk))
        if (idx >= 0) {
          newFlags[idx] = { ...newFlags[idx], [type === 'vip' ? 'is_vip' : 'is_at_risk']: enabled }
        } else {
          newFlags.push({ [type === 'vip' ? 'is_vip' : 'is_at_risk']: enabled })
        }
        return { ...prev, flags: newFlags }
      })
      adminToast.success(`${type.replace('_', ' ').toUpperCase()} status updated`)
    } catch (err) {
      adminToast.error("Handshake failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedConversation?.merchant_id) return
    const id = selectedConversation.merchant_id
    if (!confirm("Are you sure you want to trigger a password reset for this merchant owner?")) return
    
    setActionLoading('reset_pwd')
    try {
      const res = await fetch(`/api/admin/accounts/${id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Reset failed")
      adminToast.success(`Recovery link transmitted to ${data.email}`)
    } catch (err) {
      adminToast.error("Transponder failure")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendAsset = async (type: 'report' | 'invoice', assetId: string) => {
    if (!selectedId) return
    setActionLoading(`send_${assetId}`)
    try {
      const res = await fetch('/api/admin/whatsapp/send-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, assetType: type, assetId })
      })
      if (!res.ok) throw new Error("Transmission failed")
      adminToast.success(`${type.toUpperCase()} deployed to secure channel`)
    } catch (err) {
      adminToast.error("Signal lost")
    } finally {
      setActionLoading(null)
    }
  }

  const handleLinkMerchant = async (merchantId: string) => {
    if (!selectedId) return
    setLinkingMerchant(true)
    try {
      const res = await fetch(`/api/admin/whatsapp/conversation?conversationId=${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchantId })
      })
      if (!res.ok) throw new Error("Alignment failed")
      
      const { conversation: updated } = await res.json()
      
      // Update local state
      setConversations(prev => prev.map(c => 
        c.id === selectedId ? { ...c, merchant_id: merchantId, accounts: { business_name: merchants.find(m => m.account_id === merchantId)?.business_name || "Merchant" } } : c
      ))
      
      fetchMerchantData(merchantId)
      adminToast.success("Secure bridge established")
    } catch (err) {
      adminToast.error("Sync error")
    } finally {
      setLinkingMerchant(false)
    }
  }

  // Fetch Merchant Data (Context, Billing, Reports)
  const fetchMerchantData = async (merchantId: string) => {
    setLoadingContext(true)
    setLoadingBilling(true)
    setLoadingReports(true)

    try {
      const [contextRes, billingRes, reportsRes] = await Promise.all([
        fetch(`/api/admin/whatsapp/merchant-context?merchantId=${merchantId}`),
        fetch(`/api/admin/billing/${merchantId}`),
        fetch(`/api/admin/reports/merchant/${merchantId}/recent`)
      ])

      if (contextRes.ok) {
        const data = await contextRes.json()
        setMerchantContext(data.merchant)
      }
      if (billingRes.ok) {
        const data = await billingRes.json()
        setBillingData(data)
      }
      if (reportsRes.ok) {
        const data = await reportsRes.json()
        setRecentReports(data.reports || [])
      }
    } catch (err) {
      console.error("Context fetch failed", err)
    } finally {
      setLoadingContext(false)
      setLoadingBilling(false)
      setLoadingReports(false)
    }
  }

  // Re-fetch when selection changes
  useEffect(() => {
    if (selectedConversation?.merchant_id) {
       fetchMerchantData(selectedConversation.merchant_id)
    } else {
       setMerchantContext(null)
       setBillingData(null)
       setRecentReports([])
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
    <div className="flex-1 h-full flex flex-col bg-background overflow-hidden font-sans">
      {/* Sub-navigation Tabs */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-1 bg-card shrink-0">
        {[
          { id: "conversations", label: "Conversations", icon: MessageSquare },
          { id: "templates", label: "Templates", icon: FileText },
          { id: "broadcasts", label: "Broadcasts", icon: Radio },
          { id: "analytics", label: "Analytics", icon: LayoutDashboard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer group ${
              activeTab === tab.id 
                ? "bg-[#E8400C]/10 text-[#E8400C] border border-[#E8400C]/20 font-bold" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? "text-[#E8400C]" : "text-muted-foreground group-hover:text-foreground"}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {activeTab === "conversations" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Conversation List */}
            <div className="w-80 border-r border-border flex flex-col bg-card">
              {/* Search & Filters */}
              <div className="p-4 space-y-4 border-b border-border bg-card">
                <div className="flex items-center gap-2">
                  <div className="relative group flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-[#E8400C] transition-colors" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground/40 transition-colors font-medium"
                    />
                  </div>
                  <button 
                    onClick={() => setIsNewChatOpen(true)}
                    className="p-1.5 rounded-md bg-[#E8400C]/10 text-[#E8400C] hover:bg-[#E8400C]/20 transition-all border border-[#E8400C]/20 cursor-pointer shadow-sm"
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
                      className="w-full bg-background border border-border rounded-md pl-3 pr-8 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground appearance-none focus:outline-none focus:border-foreground/40 transition-colors cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="open">Open</option>
                      <option value="waiting_customer">Waiting Customer</option>
                      <option value="waiting_internal">Waiting Internal</option>
                      <option value="resolved">Resolved</option>
                      <option value="escalated">Escalated</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={filterAgent}
                      onChange={(e) => setFilterAgent(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-md pl-3 pr-8 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground appearance-none focus:outline-none focus:border-foreground/40 transition-colors cursor-pointer"
                    >
                      <option value="all">All Agents</option>
                      <option value="me">Assigned to Me</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                    <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/40">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`px-4 py-3 cursor-pointer transition-all relative flex gap-3 items-start ${
                      selectedId === conv.id 
                        ? "bg-accent border-l-2 border-[#E8400C]" 
                        : "bg-transparent hover:bg-muted/40"
                    }`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                        <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        conv.status === 'open' ? 'bg-emerald-500' : 
                        conv.status === 'resolved' ? 'bg-muted-foreground' : 'bg-amber-500'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {conv.contact_name || conv.contact_phone}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#E8400C] font-bold uppercase truncate mb-1 flex items-center gap-1.5 tracking-wider">
                        <span className="truncate">{conv.accounts?.business_name}</span>
                        {conv.assigned_agent && (
                          <>
                            <span className="text-muted-foreground/40">/</span>
                            <span className="text-muted-foreground tracking-normal normal-case font-medium">@{conv.assigned_agent.full_name.split(' ')[0]}</span>
                          </>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground truncate pr-2 italic">
                          {conv.last_message_content || "No message history"}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="bg-[#E8400C] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center animate-pulse">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panels: Chat + Context */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              <div className="flex-1 flex flex-col bg-background min-h-0 border-r border-border">
                {selectedConversation ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Chat Header */}
                    <div className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md">
                      <div className="flex gap-4 items-center">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                            selectedConversation.status === 'open' ? 'bg-emerald-500' : 
                            selectedConversation.status === 'resolved' ? 'bg-muted-foreground' : 'bg-amber-500'
                          }`} />
                        </div>
                        <div>
                          <div className="text-sm text-foreground font-bold tracking-tight">{selectedConversation.contact_name || "Merchant"}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 uppercase font-bold tracking-wider mt-0.5">
                            <span className="text-[#E8400C]">{selectedConversation.accounts?.business_name}</span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="font-mono">{selectedConversation.contact_phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {selectedConversation.status.replace("_", " ")}
                        </div>
                        <button 
                          onClick={() => setIsContextOpen(!isContextOpen)}
                          className={`p-2 rounded-md transition-all cursor-pointer ${isContextOpen ? 'bg-[#E8400C]/10 text-[#E8400C]' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                        >
                          <User className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-border" />
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 relative min-h-0 bg-background">
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
                  <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-6 min-h-0 bg-background">
                    <div className="w-24 h-24 rounded-full bg-card border border-border flex items-center justify-center shadow-sm relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#E8400C]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <MessageSquare className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">Support Command Center</h3>
                      <p className="text-muted-foreground text-xs max-w-[280px] leading-relaxed">
                        Select a secure communication channel to begin responding to high-priority merchant requests.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Context Panel */}
              {selectedConversation && (
                <div className={`bg-card border-l border-border transition-all duration-300 overflow-hidden ${isContextOpen ? 'w-80' : 'w-0'}`}>
                  <div className="w-80 h-full flex flex-col min-h-0">
                    {/* Profile Section */}
                    <div className="p-6 border-b border-border bg-card">
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center text-2xl text-[#E8400C] font-bold shadow-sm ring-4 ring-[#E8400C]/5">
                          {selectedConversation.contact_name?.[0] || selectedConversation.contact_phone.slice(-1)}
                        </div>
                        
                        <div className="text-center w-full px-4">
                          {isEditingName ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onBlur={() => {
                                  if (tempName !== selectedConversation.contact_name) {
                                     handleUpdateContext(selectedConversation.id, { contact_name: tempName })
                                  }
                                  setIsEditingName(false)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                     if (tempName !== selectedConversation.contact_name) {
                                        handleUpdateContext(selectedConversation.id, { contact_name: tempName })
                                     }
                                     setIsEditingName(false)
                                  }
                                }}
                                className="w-full bg-background border border-[#E8400C] rounded-md px-3 py-1.5 text-sm text-foreground text-center focus:outline-none font-medium"
                              />
                            </div>
                          ) : (
                            <div className="group flex items-center justify-center gap-2 cursor-pointer" onClick={() => {
                              setTempName(selectedConversation.contact_name || "")
                              setIsEditingName(true)
                            }}>
                              <h2 className="text-lg font-bold text-foreground tracking-tight">{selectedConversation.contact_name || "New Contact"}</h2>
                              <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground font-mono mt-1">{selectedConversation.contact_phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                      {!selectedConversation.merchant_id ? (
                        <div className="space-y-4 p-4 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Unlinked Session</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">This contact is not currently associated with a merchant account. Link it to enable billing and actions.</p>
                          <div className="relative">
                            <select
                              onChange={(e) => e.target.value && handleLinkMerchant(e.target.value)}
                              disabled={linkingMerchant}
                              className="w-full bg-background border border-amber-500/30 rounded-md px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-all font-semibold cursor-pointer"
                            >
                              <option value="">{linkingMerchant ? "Synchronizing..." : "Select Merchant Account..."}</option>
                              {merchants.map(m => (
                                <option key={m.account_id} value={m.account_id}>{m.business_name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Billing Context */}
                          <div className="space-y-4">
                            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider flex justify-between items-center">
                              <span>Billing Context</span>
                              {loadingBilling && <Loader2 className="w-3 h-3 animate-spin text-[#E8400C]" />}
                            </div>
                            
                            {billingData && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                   <div className="p-3 rounded-md bg-muted/30 border border-border">
                                      <div className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider mb-1">Current Plan</div>
                                      <div className="text-foreground text-xs font-bold uppercase flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-[#E8400C]" />
                                        {billingData.account.plan_tier}
                                      </div>
                                   </div>
                                   <div className="p-3 rounded-md bg-muted/30 border border-border">
                                      <div className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider mb-1">Status</div>
                                      <div className={`text-xs font-bold uppercase inline-flex items-center gap-1.5 ${
                                        billingData.account.subscription_status === 'active' ? 'text-emerald-500' : 'text-amber-500'
                                      }`}>
                                         <div className={`w-1.5 h-1.5 rounded-full ${billingData.account.subscription_status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                         {billingData.account.subscription_status}
                                      </div>
                                   </div>
                                </div>

                                <div className={`p-4 rounded-md border flex items-center justify-between group transition-all ${
                                  (billingData.summary.days_remaining ?? 0) <= 3 
                                    ? 'bg-destructive/10 border-destructive/30' 
                                    : (billingData.summary.days_remaining ?? 0) <= 7
                                      ? 'bg-amber-500/10 border-amber-500/30'
                                      : 'bg-muted/30 border-border'
                                }`}>
                                  <div>
                                     <div className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider mb-0.5">Protocol Expiry</div>
                                     <div className="text-foreground text-xs font-bold font-mono">
                                        {billingData.summary.days_remaining} Days Remaining
                                     </div>
                                  </div>
                                  <Link 
                                      href={`/admin/merchants/${selectedConversation.merchant_id}?tab=billing`}
                                      className="p-2 rounded-md bg-background border border-border opacity-0 group-hover:opacity-100 transition-all hover:bg-accent"
                                  >
                                     <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  </Link>
                                </div>

                                <div className="flex gap-2">
                                   {adminUser.role === 'super_admin' && (
                                      <button 
                                        onClick={() => setIsRecordPaymentOpen(true)}
                                        className="flex-1 py-2 rounded-md bg-muted border border-border text-[10px] font-bold uppercase tracking-wider text-foreground hover:bg-accent transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 text-[#E8400C]" />
                                        Record Payment
                                      </button>
                                   )}
                                    <Link 
                                      href={`/admin/merchants/${selectedConversation.merchant_id}?tab=billing`}
                                      className="px-3 py-2 rounded bg-muted border border-border text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                                    >
                                      Full Billing
                                   </Link>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="space-y-4">
                            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Quick Actions</div>
                            <div className="space-y-2">
                              {/* Send Report */}
                              <div className="group relative">
                                <button className="w-full flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border hover:border-foreground/40 transition-all cursor-pointer">
                                   <div className="flex items-center gap-3">
                                      <FileText className="w-4 h-4 text-muted-foreground group-hover:text-[#E8400C] transition-colors" />
                                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Send Sales Report</span>
                                   </div>
                                   <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                
                                {recentReports.length > 0 && (
                                  <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border rounded-md shadow-2xl z-10 hidden group-hover:block animate-in fade-in slide-in-from-top-1">
                                     {recentReports.map(rep => (
                                       <button 
                                         key={rep.id}
                                         onClick={() => handleSendAsset('report', rep.id)}
                                         disabled={actionLoading === `send_${rep.id}`}
                                         className="w-full text-left p-3 hover:bg-accent flex items-center justify-between group/item border-b border-border last:border-0 cursor-pointer"
                                       >
                                          <div>
                                             <div className="text-[10px] font-bold text-foreground uppercase tracking-wider">{rep.report_type.replace('_', ' ')}</div>
                                             <div className="text-[9px] text-muted-foreground font-mono">{new Date(rep.created_at).toLocaleDateString()}</div>
                                          </div>
                                          {actionLoading === `send_${rep.id}` ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-[#E8400C]" />
                                          ) : (
                                            <Zap className="w-3.5 h-3.5 text-[#E8400C] opacity-0 group-hover/item:opacity-100 transition-all" />
                                          )}
                                       </button>
                                     ))}
                                  </div>
                                )}
                              </div>

                              {billingData?.summary?.outstanding_kes > 0 && (
                                 <button 
                                   onClick={() => {
                                     const unpaid = (billingData.invoices || []).find((i: any) => ['unpaid', 'overdue'].includes(i.status))
                                     if (unpaid) handleSendAsset('invoice', unpaid.id)
                                   }}
                                   disabled={actionLoading?.startsWith('send_')}
                                   className="w-full flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border hover:border-foreground/40 transition-all group cursor-pointer"
                                 >
                                    <div className="flex items-center gap-3">
                                       <Zap className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                       <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Send Unpaid Invoice</span>
                                    </div>
                                    {actionLoading?.startsWith('send_') ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8400C]" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                                 </button>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                 <button 
                                   onClick={() => {
                                     const isVip = !!billingData?.flags?.find((f: any) => f.is_vip)?.is_vip
                                     handleToggleFlag('vip', !isVip)
                                   }}
                                   disabled={actionLoading === 'vip'}
                                   className={`p-3 rounded-md border transition-all flex flex-col gap-1.5 cursor-pointer shadow-sm ${
                                     billingData?.flags?.find((f: any) => f.is_vip)?.is_vip 
                                       ? 'bg-[#E8400C]/10 border-[#E8400C] text-[#E8400C]' 
                                       : 'bg-muted/30 border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                                   }`}
                                 >
                                    <Crown className="w-4 h-4" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">VIP Status</span>
                                 </button>

                                 <button 
                                   onClick={() => {
                                     const isAtRisk = !!billingData?.flags?.find((f: any) => f.is_at_risk)?.is_at_risk
                                     handleToggleFlag('at_risk', !isAtRisk)
                                   }}
                                   disabled={actionLoading === 'at_risk'}
                                   className={`p-3 rounded-md border transition-all flex flex-col gap-1.5 cursor-pointer shadow-sm ${
                                     billingData?.flags?.find((f: any) => f.is_at_risk)?.is_at_risk 
                                       ? 'bg-destructive/10 border-destructive text-destructive' 
                                       : 'bg-muted/30 border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                                   }`}
                                 >
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Churn Risk</span>
                                 </button>
                              </div>

                              {adminUser.role === 'super_admin' && (
                                 <button 
                                   onClick={handleResetPassword}
                                   disabled={actionLoading === 'reset_pwd'}
                                   className="w-full flex items-center justify-between p-3 rounded-md bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-all group cursor-pointer"
                                 >
                                    <div className="flex items-center gap-3">
                                       <Key className="w-4 h-4 text-destructive/80 group-hover:text-destructive transition-colors" />
                                       <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Reset Password</span>
                                    </div>
                                    {actionLoading === 'reset_pwd' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" /> : <Shield className="w-3.5 h-3.5 text-destructive/40" />}
                                 </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Notes Section */}
                      <div className="mt-8 space-y-4">
                        <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Persistent Notes</h3>
                        <div className="space-y-2">
                          <textarea
                            placeholder="Add notes about this contact..."
                            defaultValue={selectedConversation.notes || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (selectedConversation.notes || "")) {
                                 handleUpdateContext(selectedConversation.id, { notes: e.target.value })
                              }
                            }}
                            className="w-full bg-background border border-border rounded-md p-3 text-xs text-foreground h-32 resize-none focus:outline-none focus:border-foreground/40 transition-all leading-relaxed font-medium"
                          />
                          <div className="text-[10px] text-muted-foreground font-medium italic text-right">
                            {isSavingContext ? "Synchronizing..." : "Encrypted protocol active"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alternate Tabs */}
        {activeTab === "broadcasts" && <BroadcastsTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        
        {activeTab === "templates" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4 bg-background">
             <FileText className="w-12 h-12 text-muted-foreground/40" />
             <div className="text-center space-y-2">
                <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">Template Depository</h3>
                <p className="text-muted-foreground text-xs font-medium max-w-[240px] leading-relaxed">Strategic message templates management system pending deployment.</p>
             </div>
          </div>
        )}
      </div>

      {isRecordPaymentOpen && selectedConversation?.merchant_id && (
        <RecordPaymentModal 
          accountId={selectedConversation.merchant_id}
          onClose={() => setIsRecordPaymentOpen(false)}
          onSuccess={() => {
            setIsRecordPaymentOpen(false)
            if (selectedConversation.merchant_id) {
              fetchMerchantData(selectedConversation.merchant_id)
            }
          }}
        />
      )}

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
      <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#E8400C]">Initiate Output</h3>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Establish new secure channel</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Recipient Phone (E.164)</label>
            <input
              type="text"
              placeholder="+254..."
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:border-foreground/40 transition-all font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Link to Merchant</label>
            <select
              value={newMerchant}
              onChange={(e) => setNewMerchant(e.target.value)}
              className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:border-foreground/40 transition-all font-medium cursor-pointer"
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
          disabled={isCreating}
          className="w-full py-3 rounded-md bg-[#E8400C] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#E8400C]/90 transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-md"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Connect Protocol
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
