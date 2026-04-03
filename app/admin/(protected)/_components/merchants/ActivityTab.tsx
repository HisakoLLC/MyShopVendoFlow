"use client"

import { useState, useEffect } from "react"
import { 
  CreditCard, 
  User, 
  DollarSign, 
  FileText, 
  AlertCircle,
  Clock,
  ChevronDown,
  Activity,
  Zap,
  ShieldAlert,
  ShieldCheck,
  StickyNote
} from "lucide-react"
import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"
import { EmptyState } from "@/app/admin/(protected)/_components/ui/EmptyState"

interface ActivityEvent {
  type: "billing" | "admin_action" | "payment" | "invoice"
  timestamp: string
  data: any
}

export default function ActivityTab({ accountId }: { accountId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [limit, setLimit] = useState(50)
  const [hasMore, setHasMore] = useState(false)

  async function load(currentLimit: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/activity?limit=${currentLimit}`)
      if (!res.ok) throw new Error("Failed to load activity history")
      const d = await res.json()
      setEvents(d.events)
      setHasMore(d.hasMore)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(limit) }, [accountId, limit])

  if (loading && events.length === 0) {
    return <LoadingSkeleton className="h-96 w-full" />
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500/80 text-[10px] uppercase font-bold tracking-widest bg-red-500/5 border border-red-500/10 rounded-sm p-4 animate-in fade-in slide-in-from-top-1">
        <AlertCircle className="w-3.5 h-3.5" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f1f1f] bg-[#161616] flex justify-between items-center">
          <h3 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#22c55e]" />
            Event Protocol Timeline
          </h3>
          <div className="text-[10px] text-[#444] font-mono italic">Audit Log: {events.length} Records</div>
        </div>

        <div className="p-8 relative">
          {events.length > 0 && (
            <div className="absolute left-[39px] top-12 bottom-12 w-px bg-[#1f1f1f]" />
          )}

          <div className="space-y-12">
            {events.map((event, idx) => (
              <TimelineItem key={idx} event={event} isLast={idx === events.length - 1} />
            ))}

            {events.length === 0 && (
               <EmptyState 
                 icon={Activity}
                 title="NO_ACTIVITY_TRACES"
                 description="Audit stream indicates zero inbound event packets for this account."
               />
            )}
          </div>

          {hasMore && (
            <div className="mt-12 pt-8 border-t border-[#1f1f1f] flex justify-center">
              <button 
                onClick={() => setLimit(prev => prev + 50)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-sm border border-[#1f1f1f] text-[10px] font-black uppercase tracking-widest text-[#555] hover:text-white hover:border-white/20 transition-all bg-white/[0.01]"
              >
                Load more
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ event, isLast }: { event: ActivityEvent, isLast: boolean }) {
  const { type, timestamp, data } = event
  const date = new Date(timestamp)

  const getConfig = () => {
    if (type === "admin_action") {
      const action = data.action
      if (action === "account_suspended") return { color: "bg-red-400", icon: ShieldAlert, actor: data.actor?.full_name || "Admin" }
      if (action === "account_reactivated") return { color: "bg-emerald-400", icon: ShieldCheck, actor: data.actor?.full_name || "Admin" }
      if (action === "plan_changed") return { color: "bg-blue-400", icon: Zap, actor: data.actor?.full_name || "Admin" }
      if (action === "note_added") return { color: "bg-zinc-600", icon: StickyNote, actor: data.actor?.full_name || "Admin" }
      return { color: "bg-zinc-600", icon: User, actor: data.actor?.full_name || "Admin" }
    }
    if (type === "billing" || type === "payment" || type === "invoice") {
      return { color: "bg-emerald-400", icon: type === "payment" ? DollarSign : (type === "invoice" ? FileText : CreditCard), actor: "Dodo Pipeline" }
    }
    return { color: "bg-zinc-700", icon: Clock, actor: "System" }
  }

  const { color, icon: Icon, actor } = getConfig()

  const getDisplay = () => {
     if (type === "billing") return { title: data.event_type?.replace(/\./g, " ").toUpperCase(), desc: data.event_data?.message || "Subscription state updated" }
     if (type === "admin_action") return { title: data.action?.replace(/_/g, " ").toUpperCase(), desc: data.metadata?.reason || `Administrative modification` }
     if (type === "payment") return { title: `PAYMENT RECEIVED — ${data.method?.toUpperCase()}`, desc: `KES ${Number(data.amount).toLocaleString()} credited to account` }
     if (type === "invoice") return { title: `INVOICE ${data.invoice_number} ISSUED`, desc: `Liability of KES ${Number(data.amount).toLocaleString()} due on ${new Date(data.due_date).toLocaleDateString()}` }
     return { title: "UNKNOWN EVENT", desc: "System logged an untagged trace." }
  }

  const { title, desc } = getDisplay()

  return (
    <div className="flex gap-8 group">
      <div className="relative flex flex-col items-center">
        <div className={`z-10 w-2.5 h-2.5 rounded-full ring-4 ring-[#0a0a0a] ${color} shadow-lg shadow-black group-hover:scale-125 transition-transform duration-300 mt-2`} />
      </div>

      <div className="flex-1 pb-2 space-y-1.5 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90 group-hover:text-white transition-colors">
               {title}
             </h4>
          </div>
        </div>

        <p className="text-xs text-[#666] leading-relaxed group-hover:text-[#999] transition-colors font-medium">
          {desc}
        </p>

        <div className="flex items-center gap-3 pt-1">
           <div className="flex items-center gap-1 text-[9px] font-black uppercase text-[#444] tracking-tighter">
             <Icon className="w-2.5 h-2.5 text-[#333]" />
             {actor}
           </div>
           <span className="text-[8px] text-[#222] font-black tracking-widest uppercase">/</span>
           <time className="text-[9px] font-mono text-[#444] font-bold uppercase tracking-tighter">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {date.toLocaleDateString("en-GB", { day: '2-digit', month: "short" })}
          </time>
        </div>
      </div>
    </div>
  )
}
