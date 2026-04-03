"use client"

import { useEffect, useState } from "react"
import { 
  Plus, 
  Megaphone, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  ChevronDown
} from "lucide-react"
import MerchantsTable, { MerchantListItem } from "./MerchantsTable"
import { CreateMerchantModal, CreateBroadcastModal } from "../../_components/merchants/billing"
import PermissionGate from "../../_components/PermissionGate"

interface HealthSignal {
  accountId: string
  activityStatus: "active" | "inactive" | "critical" | "new"
  daysSinceLastSale: number | null
  onboardingScore: number
  incompleteSteps: string[]
  churnRisk: "low" | "medium" | "high"
  featureAdoptionCount: number
  adoptedFeatures: string[]
}

interface MerchantsShellProps {
  merchants: MerchantListItem[]
}

export type ChurnRiskFilter = "all" | "high" | "medium"

export default function MerchantsShell({ merchants }: MerchantsShellProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [healthSignals, setHealthSignals] = useState<Record<string, HealthSignal>>({})
  const [isLoadingHealth, setIsLoadingHealth] = useState(true)
  const [churnFilter, setChurnFilter] = useState<ChurnRiskFilter>("all")

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/admin/accounts/health-signals")
        if (res.ok) {
          const data: HealthSignal[] = await res.json()
          const map = data.reduce((acc, curr) => ({ ...acc, [curr.accountId]: curr }), {})
          setHealthSignals(map)
        }
      } catch (err) {
        console.error("Failed to fetch health signals:", err)
      } finally {
        setIsLoadingHealth(false)
      }
    }
    fetchHealth()
  }, [])

  const highRiskCount = Object.values(healthSignals).filter(h => h.churnRisk === "high").length

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-[#1f1f1f] p-5 rounded-lg flex items-center justify-between group hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#444]">Total Accounts</div>
            <div className="text-3xl font-black font-mono tracking-tighter text-white">{merchants.length}</div>
          </div>
          <Activity className="w-5 h-5 text-[#444] opacity-40 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-lg flex items-center justify-between group hover:border-red-500/40 transition-colors">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-400/60">High Churn Risk</div>
            <div className="text-3xl font-black font-mono tracking-tighter text-red-500">
              {isLoadingHealth ? "..." : highRiskCount}
            </div>
          </div>
          <AlertTriangle className="w-5 h-5 text-red-500 opacity-40 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-[#111] border border-[#1f1f1f] p-5 rounded-lg flex items-center justify-between group hover:border-white/10 transition-colors lg:col-span-2">
          <div className="flex items-center gap-6 w-full">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#444]">Health Filter</div>
              <div className="flex items-center gap-2 mt-1">
                {(["all", "high", "medium"] as ChurnRiskFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setChurnFilter(f)}
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-sm border transition-all ${
                      churnFilter === f 
                        ? "bg-white text-black border-white" 
                        : "bg-transparent text-[#666] border-[#1f1f1f] hover:border-[#333]"
                    }`}
                  >
                    {f} Risk
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[#444] text-[10px] tracking-widest uppercase font-bold text-[#22c55e]">
            CRM & Monitoring
          </p>
          <h1 className="text-white text-2xl font-bold tracking-tight">Merchant List</h1>
        </div>

        <div className="flex items-center gap-3">
          <PermissionGate permission="merchants_create">
            <button
              onClick={() => setShowBroadcast(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border border-[#1f1f1f] text-white rounded-sm text-[11px] font-black uppercase tracking-widest hover:border-white/20 transition-all active:scale-95"
            >
              <Megaphone className="w-4 h-4 text-[#22c55e]" />
              New Broadcast
            </button>
          </PermissionGate>

          <div className="w-px h-8 bg-[#1f1f1f] mx-1" />

          <PermissionGate permission="merchants_create">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] text-black rounded-sm text-[11px] font-black uppercase tracking-widest hover:bg-[#1eb054] transition-all shadow-lg shadow-[#22c55e]/10 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Merchant
            </button>
          </PermissionGate>
        </div>
      </div>

      <MerchantsTable
        merchants={merchants}
        healthSignals={healthSignals}
        churnFilter={churnFilter}
      />

      <CreateMerchantModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {showBroadcast && (
        <CreateBroadcastModal
          onClose={() => setShowBroadcast(false)}
          onSuccess={() => {
            setShowBroadcast(false)
          }}
        />
      )}
    </div>
  )
}
