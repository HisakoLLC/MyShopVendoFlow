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
  starter: "bg-muted text-muted-foreground border-border",
  core:    "bg-blue-500/10 text-blue-500 border-blue-500/20",
  scale:   "bg-purple-500/10 text-purple-500 border-purple-500/20",
  trial:   "bg-amber-500/10 text-amber-500 border-amber-500/20",
}

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  trial:     "bg-amber-500/10 text-amber-500 border-amber-500/20",
  past_due:  "bg-destructive/10 text-destructive border-destructive/20",
  suspended: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
}

const ACTIVITY_COLORS: Record<string, string> = {
  active:   "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  inactive: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  critical: "text-destructive bg-destructive/10 border-destructive/20",
  new:      "text-muted-foreground bg-muted border-border",
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-muted-foreground text-[10px]">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${PLAN_BADGE[plan] ?? PLAN_BADGE.starter}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-[10px]">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${STATUS_BADGE[status] ?? STATUS_BADGE.cancelled}`}>
      {status.replace("_", " ")}
    </span>
  )
}

function OnboardingProgress({ score }: { score: number }) {
  return (
    <div className="w-24 space-y-1">
      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Step Progress</span>
        <span className={score === 100 ? "text-emerald-500 font-mono" : "font-mono"}>{score}%</span>
      </div>
      <div className="h-1.5 bg-accent rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${score === 100 ? "bg-emerald-500" : "bg-[#E8400C]"}`} 
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
    <div className="space-y-4 font-sans">
      {/* Search & Basic Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <input
            type="text"
            placeholder="Search by business name, email or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors shadow-sm"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Merchant info</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Churn Risk</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Onboarding</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tier / Status</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Sales (Total)</th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(m => {
                const health = healthSignals[m.account_id]
                return (
                  <tr
                    key={m.account_id}
                    onClick={() => router.push(`/admin/merchants/${m.account_id}`)}
                    className="hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    {/* Merchant Info */}
                    <td className="px-5 py-4">
                      <div className="text-sm text-foreground font-bold group-hover:text-[#E8400C] transition-colors">
                        {m.business_name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-mono leading-none">{m.account_id.slice(0,8)}...</span>
                        <span className="text-[10px] text-muted-foreground/40 leading-none">•</span>
                        <span className="text-[10px] text-muted-foreground leading-none">{m.owner_email}</span>
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="px-5 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${ACTIVITY_COLORS[health?.activityStatus || "new"]}`}>
                        <ActivityIcon className="w-3 h-3" />
                        {health?.activityStatus || "new"}
                      </div>
                    </td>

                    {/* Churn Risk */}
                    <td className="px-5 py-4">
                      {health?.churnRisk && health.churnRisk !== "low" ? (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${
                          health.churnRisk === "high" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>
                          <ShieldAlert className="w-3 h-3" />
                          {health.churnRisk} RISK
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">—</span>
                      )}
                    </td>

                    {/* Onboarding */}
                    <td className="px-5 py-4">
                      <OnboardingProgress score={health?.onboardingScore || 0} />
                    </td>

                    {/* Tier / Status */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <PlanBadge plan={m.plan_tier} />
                        <StatusBadge status={m.subscription_status} />
                      </div>
                    </td>

                    {/* Sales */}
                    <td className="px-5 py-4 text-right font-mono tabular-nums">
                      <PermissionGate permission="merchants_financial" fallback={<span className="text-muted-foreground">---</span>}>
                        <div className="text-xs text-foreground font-bold">
                          {m.total_sales.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal uppercase ml-0.5">Kes</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5 font-sans">Lifetime Revenue</div>
                      </PermissionGate>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/merchants/${m.account_id}`)}
                          className="p-1.5 bg-accent border border-border text-foreground rounded hover:border-foreground/40 transition-all cursor-pointer"
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
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-accent border border-border flex items-center justify-center">
                        <Search className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-foreground text-sm font-bold tracking-tight">No Results Found</p>
                        <p className="text-muted-foreground text-xs font-medium">Try adjusting your search or risk filters.</p>
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
