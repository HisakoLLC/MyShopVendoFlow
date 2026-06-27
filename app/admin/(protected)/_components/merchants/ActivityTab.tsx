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
      <div className="flex items-center gap-2 text-destructive text-xs font-semibold bg-destructive/10 border border-destructive/20 rounded-md p-4 animate-in fade-in slide-in-from-top-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex justify-between items-center">
          <h3 className="text-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#E8400C]" />
            Event Protocol Timeline
          </h3>
          <div className="text-[11px] text-muted-foreground font-mono italic">Audit Log: {events.length} Records</div>
        </div>

        <div className="p-8 relative">
          {events.length > 0 && (
            <div className="absolute left-[39px] top-12 bottom-12 w-px bg-border" />
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
            <div className="mt-12 pt-8 border-t border-border flex justify-center">
              <button 
                onClick={() => setLimit(prev => prev + 50)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-md border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all bg-card cursor-pointer shadow-sm"
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
      if (action === "account_suspended") return { color: "bg-destructive", icon: ShieldAlert, actor: data.actor?.full_name || "Admin" }
      if (action === "account_reactivated") return { color: "bg-emerald-500", icon: ShieldCheck, actor: data.actor?.full_name || "Admin" }
      if (action === "plan_changed") return { color: "bg-blue-500", icon: Zap, actor: data.actor?.full_name || "Admin" }
      if (action === "note_added") return { color: "bg-muted-foreground", icon: StickyNote, actor: data.actor?.full_name || "Admin" }
      return { color: "bg-muted-foreground", icon: User, actor: data.actor?.full_name || "Admin" }
    }
    if (type === "billing" || type === "payment" || type === "invoice") {
      return { color: "bg-emerald-500", icon: type === "payment" ? DollarSign : (type === "invoice" ? FileText : CreditCard), actor: "Dodo Pipeline" }
    }
    return { color: "bg-muted-foreground", icon: Clock, actor: "System" }
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
        <div className={`z-10 w-2.5 h-2.5 rounded-full ring-4 ring-card ${color} shadow-sm group-hover:scale-125 transition-transform duration-300 mt-2`} />
      </div>

      <div className="flex-1 pb-2 space-y-1.5 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <h4 className="text-xs font-bold uppercase tracking-wider text-foreground group-hover:text-[#E8400C] transition-colors">
               {title}
             </h4>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors font-medium">
          {desc}
        </p>

        <div className="flex items-center gap-3 pt-1">
           <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground tracking-tight">
             <Icon className="w-3 h-3 text-muted-foreground" />
             {actor}
           </div>
           <span className="text-[10px] text-muted-foreground/40 font-bold uppercase">/</span>
           <time className="text-[10px] font-mono text-muted-foreground font-semibold uppercase tracking-tight">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {date.toLocaleDateString("en-GB", { day: '2-digit', month: "short" })}
          </time>
        </div>
      </div>
    </div>
  )
}
