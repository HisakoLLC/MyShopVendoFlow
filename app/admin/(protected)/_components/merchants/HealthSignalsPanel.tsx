"use client"

import { useEffect, useState } from "react"
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Layers,
  ShoppingCart,
  Users,
  MapPin,
  Loader2,
  ChevronRight
} from "lucide-react"

interface HealthSignal {
  accountId: string
  activityStatus: "active" | "inactive" | "critical" | "new"
  lastSaleDate: string | null
  daysSinceLastSale: number | null
  onboardingScore: number
  incompleteSteps: string[]
  churnRisk: "low" | "medium" | "high"
  featureAdoptionCount: number
  adoptedFeatures: string[]
}

interface HealthSignalsPanelProps {
  accountId: string
}

import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"

export default function HealthSignalsPanel({ accountId }: HealthSignalsPanelProps) {
  const [health, setHealth] = useState<HealthSignal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch(`/api/admin/accounts/${accountId}/health`)
        if (res.ok) {
          const data = await res.json()
          setHealth(data)
        }
      } catch (err) {
        console.error("Failed to fetch health for account:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchHealth()
  }, [accountId])

  if (loading) {
    return <LoadingSkeleton className="h-96 w-full" />
  }

  if (!health) return null

  const activityColor = {
    active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    inactive: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    critical: "text-red-400 bg-red-400/10 border-red-400/20",
    new: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"
  }[health.activityStatus]

  const riskLevel = {
    low: { label: "SAFE", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/10", desc: "Stable engagement" },
    medium: { label: "MODERATE", color: "text-amber-400 bg-amber-400/10 border-amber-400/10", desc: "Low recent activity" },
    high: { label: "CRITICAL", color: "text-red-400 bg-red-400/10 border-red-400/10", desc: "Imminent churn risk" }
  }[health.churnRisk]

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden shadow-xl">
      <div className="bg-[#141414] px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <h3 className="text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#22c55e]" />
          Health Signals
        </h3>
        <div className={`px-2 py-0.5 rounded-sm border text-[8px] font-black uppercase tracking-widest ${activityColor}`}>
          {health.activityStatus}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Row 1: Last Sale */}
        <div className="flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#444]">Last Sale Event</p>
            <p className="text-sm text-white font-mono flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#444]" />
              {health.daysSinceLastSale === null 
                ? "Never Recorded" 
                : health.daysSinceLastSale === 0 ? "Today" : `${health.daysSinceLastSale} days ago`
              }
            </p>
          </div>
          <div className={`w-1.5 h-1.5 rounded-full ${health.activityStatus === 'active' ? 'bg-[#22c55e]' : 'bg-[#444]'} animate-pulse`} />
        </div>

        {/* Row 2: Onboarding Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#444]">Onboarding Score</p>
            <p className={`text-sm font-black font-mono tracking-tighter ${health.onboardingScore === 100 ? 'text-[#22c55e]' : 'text-white'}`}>
              {health.onboardingScore}%
            </p>
          </div>
          <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${health.onboardingScore === 100 ? 'bg-[#22c55e]' : 'bg-white/40'}`} 
              style={{ width: `${health.onboardingScore}%` }} 
            />
          </div>
          {health.incompleteSteps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {health.incompleteSteps.map(step => (
                <span key={step} className="px-2 py-0.5 bg-[#161616] border border-[#1f1f1f] text-[#555] text-[8px] font-bold uppercase tracking-widest rounded-sm">
                  {step}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Feature Adoption */}
        <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#444]">Feature Adoption</p>
              <p className="text-[10px] font-bold tracking-tighter text-white/60">
                {health.featureAdoptionCount} / 4 Adopting
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <FeatureIcon 
                adopted={health.adoptedFeatures.includes("inventory")} 
                icon={<Layers className="w-4 h-4" />} 
                label="Stock" 
              />
              <FeatureIcon 
                adopted={health.adoptedFeatures.includes("purchasing")} 
                icon={<ShoppingCart className="w-4 h-4" />} 
                label="Orders" 
              />
              <FeatureIcon 
                adopted={health.adoptedFeatures.includes("crm")} 
                icon={<Users className="w-4 h-4" />} 
                label="CRM" 
              />
              <FeatureIcon 
                adopted={health.adoptedFeatures.includes("multistore")} 
                icon={<MapPin className="w-4 h-4" />} 
                label="Multi" 
              />
            </div>
        </div>

        {/* Row 4: Churn Risk */}
        <div className={`p-4 rounded border transition-all ${riskLevel.color}`}>
          <div className="flex items-center justify-between mb-1">
             <div className="flex items-center gap-2">
               <AlertTriangle className="w-3.5 h-3.5" />
               <span className="text-[10px] font-black uppercase tracking-widest">Churn Risk: {riskLevel.label}</span>
             </div>
             <ChevronRight className="w-3 h-3 opacity-40" />
          </div>
          <p className="text-[9px] opacity-60 font-medium">
            {riskLevel.desc}
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureIcon({ adopted, icon, label }: { adopted: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-2.5 rounded border transition-all ${
      adopted 
        ? "bg-white/5 border-white/10 text-white shadow-lg" 
        : "bg-[#0d0d0d] border-[#1f1f1f] text-[#333]"
    }`}>
      {icon}
      <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${adopted ? 'text-[#22c55e]' : ''}`}>
        {label}
      </span>
    </div>
  )
}
