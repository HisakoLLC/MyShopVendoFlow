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
    <div className="space-y-6 font-sans">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border p-5 rounded-lg flex items-center justify-between group hover:border-foreground/20 transition-colors shadow-sm">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Accounts</div>
            <div className="text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums">{merchants.length}</div>
          </div>
          <Activity className="w-5 h-5 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-destructive/5 border border-destructive/20 p-5 rounded-lg flex items-center justify-between group hover:border-destructive/40 transition-colors shadow-sm">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-destructive/80">High Churn Risk</div>
            <div className="text-3xl font-bold font-mono tracking-tight text-destructive tabular-nums">
              {isLoadingHealth ? "..." : highRiskCount}
            </div>
          </div>
          <AlertTriangle className="w-5 h-5 text-destructive opacity-40 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-card border border-border p-5 rounded-lg flex items-center justify-between group hover:border-foreground/20 transition-colors lg:col-span-2 shadow-sm">
          <div className="flex items-center gap-6 w-full">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Health Filter</div>
              <div className="flex items-center gap-2 mt-1">
                {(["all", "high", "medium"] as ChurnRiskFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setChurnFilter(f)}
                    className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
                      churnFilter === f 
                        ? "bg-foreground text-background border-foreground" 
                        : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
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
          <p className="text-[#E8400C] text-[10px] tracking-widest uppercase font-bold">
            CRM & Monitoring
          </p>
          <h1 className="font-editorial text-foreground text-4xl font-bold tracking-tight uppercase">Merchant List</h1>
        </div>

        <div className="flex items-center gap-3">
          <PermissionGate permission="merchants_create">
            <button
              onClick={() => setShowBroadcast(true)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md text-xs font-semibold uppercase tracking-wider hover:border-foreground/40 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Megaphone className="w-4 h-4 text-[#E8400C]" />
              New Broadcast
            </button>
          </PermissionGate>

          <div className="w-px h-8 bg-border mx-1" />

          <PermissionGate permission="merchants_create">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2 bg-[#E8400C] text-white rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-[#c73508] transition-all shadow-sm active:scale-95 cursor-pointer"
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
