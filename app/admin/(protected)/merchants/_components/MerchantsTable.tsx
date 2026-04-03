"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search, ChevronRight, Store, Package,
  Calendar, Lock, CreditCard, Plus,
  ChevronDown, AlertCircle,
  Activity as ActivityIcon,
  ShieldAlert,
  Zap
} from "lucide-react"
import PermissionGate from "../../_components/PermissionGate"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MerchantListItem = {
  account_id:                      string
  business_name:                   string
  owner_email:                     string
  store_count:                     number
  product_count:                   number
  total_sales:                     number
  created_at:                      string
  plan_tier:                       string | null
  subscription_status:             string | null
  subscription_current_period_end: string | null
}

interface HealthSignal {
  activityStatus: "active" | "inactive" | "critical" | "new"
  daysSinceLastSale: number | null
  onboardingScore: number
  churnRisk: "low" | "medium" | "high"
}

interface MerchantsTableProps {
  merchants: MerchantListItem[]
  healthSignals?: Record<string, HealthSignal>
  churnFilter?: "all" | "high" | "medium"
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  core:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  scale:   "bg-purple-500/10 text-purple-400 border-purple-500/20",
  trial:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  trial:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  past_due:  "bg-red-500/10 text-red-400 border-red-500/20",
  suspended: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
}

const ACTIVITY_COLORS: Record<string, string> = {
  active:   "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  inactive: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  critical: "text-red-400 bg-red-400/10 border-red-400/20",
  new:      "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-[#444] text-[10px]">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider border ${PLAN_BADGE[plan] ?? PLAN_BADGE.starter}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[#444] text-[10px]">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider border ${STATUS_BADGE[status] ?? STATUS_BADGE.cancelled}`}>
      {status.replace("_", " ")}
    </span>
  )
}

function OnboardingProgress({ score }: { score: number }) {
  return (
    <div className="w-24 space-y-1">
      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter text-[#444]">
        <span>Step Progress</span>
        <span className={score === 100 ? "text-emerald-400" : ""}>{score}%</span>
      </div>
      <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${score === 100 ? "bg-emerald-500" : "bg-[#22c55e]"}`} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type PlanFilter    = "all" | "starter" | "core" | "scale" | "trial"
type StatusFilter  = "all" | "active" | "trial" | "past_due" | "suspended"

export default function MerchantsTable({
  merchants,
  healthSignals = {},
  churnFilter = "all"
}: MerchantsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const filtered = useMemo(() => {
    return merchants.filter(m => {
      const q = search.toLowerCase()
      const health = healthSignals[m.account_id]

      if (q && !m.business_name?.toLowerCase().includes(q) && !m.owner_email?.toLowerCase().includes(q)) return false
      if (planFilter !== "all" && m.plan_tier !== planFilter) return false
      if (statusFilter !== "all" && m.subscription_status !== statusFilter) return false
      
      if (churnFilter !== "all") {
        if (!health || health.churnRisk !== churnFilter) return false
      }

      return true
    })
  }, [merchants, search, planFilter, statusFilter, churnFilter, healthSignals])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="space-y-4">
      {/* Search & Basic Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333] group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Search by business name, email or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-sm pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#333] transition-colors"
          />
        </div>
      </div>

      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#0c0c0c]">
                <th className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#444]">Merchant info</th>
                <th className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#444]">Activity</th>
                <th className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#444]">Churn Risk</th>
                <th className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#444]">Onboarding</th>
                <th className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#444]">Tier / Status</th>
                <th className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#444] text-right">Sales (Total)</th>
                <th className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#444] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818]">
              {filtered.map(m => {
                const health = healthSignals[m.account_id]
                return (
                  <tr
                    key={m.account_id}
                    onClick={() => router.push(`/admin/merchants/${m.account_id}`)}
                    className="hover:bg-[#161616] transition-colors cursor-pointer group"
                  >
                    {/* Merchant Info */}
                    <td className="px-5 py-5">
                      <div className="text-sm text-white font-bold group-hover:text-[#22c55e] transition-colors">
                        {m.business_name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[#555] font-mono leading-none">{m.account_id.slice(0,8)}...</span>
                        <span className="text-[10px] text-[#444] leading-none">•</span>
                        <span className="text-[10px] text-[#555] leading-none">{m.owner_email}</span>
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="px-5 py-5">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[9px] font-black uppercase tracking-widest ${ACTIVITY_COLORS[health?.activityStatus || "new"]}`}>
                        <ActivityIcon className="w-2.5 h-2.5" />
                        {health?.activityStatus || "new"}
                      </div>
                    </td>

                    {/* Churn Risk */}
                    <td className="px-5 py-5">
                      {health?.churnRisk && health.churnRisk !== "low" ? (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[9px] font-black uppercase tracking-widest ${
                          health.churnRisk === "high" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>
                          <ShieldAlert className="w-2.5 h-2.5" />
                          {health.churnRisk} RISK
                        </div>
                      ) : (
                        <span className="text-[#333] text-[9px] font-bold uppercase tracking-widest">—</span>
                      )}
                    </td>

                    {/* Onboarding */}
                    <td className="px-5 py-5">
                      <OnboardingProgress score={health?.onboardingScore || 0} />
                    </td>

                    {/* Tier / Status */}
                    <td className="px-5 py-5">
                      <div className="flex flex-col gap-1.5">
                        <PlanBadge plan={m.plan_tier} />
                        <StatusBadge status={m.subscription_status} />
                      </div>
                    </td>

                    {/* Sales */}
                    <td className="px-5 py-5 text-right font-mono">
                      <PermissionGate permission="merchants_financial" fallback={<span className="text-[#222]">---</span>}>
                        <div className="text-sm text-white font-bold opacity-80">
                          {m.total_sales.toLocaleString()} <span className="text-[10px] text-[#444] font-normal uppercase ml-0.5">Kes</span>
                        </div>
                        <div className="text-[9px] text-[#444] font-bold uppercase tracking-tighter mt-0.5">Lifetime Revenue</div>
                      </PermissionGate>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/merchants/${m.account_id}`)}
                          className="p-2 bg-[#111] border border-[#1f1f1f] text-white rounded-sm hover:border-white/20 transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#111] border border-[#1f1f1f] flex items-center justify-center">
                        <Search className="w-5 h-5 text-[#333]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white text-sm font-bold tracking-tight">No Results Found</p>
                        <p className="text-[#444] text-xs">Try adjusting your search or risk filters.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
