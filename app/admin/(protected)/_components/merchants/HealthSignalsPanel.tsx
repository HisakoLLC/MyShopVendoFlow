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
      if (!accountId || accountId === "undefined") return
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
    active: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    inactive: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    critical: "text-destructive bg-destructive/10 border-destructive/20",
    new: "text-muted-foreground bg-muted border-border"
  }[health.activityStatus]

  const riskLevel = {
    low: { label: "SAFE", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", desc: "Stable engagement" },
    medium: { label: "MODERATE", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", desc: "Low recent activity" },
    high: { label: "CRITICAL", color: "text-destructive bg-destructive/10 border-destructive/20", desc: "Imminent churn risk" }
  }[health.churnRisk]

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm font-sans">
      <div className="bg-muted/40 px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-foreground text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#E8400C]" />
          Health Signals
        </h3>
        <div className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${activityColor}`}>
          {health.activityStatus}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Row 1: Last Sale */}
        <div className="flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Sale Event</p>
            <p className="text-sm text-foreground font-mono font-bold flex items-center gap-1.5 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {health.daysSinceLastSale === null 
                ? "Never Recorded" 
                : health.daysSinceLastSale === 0 ? "Today" : `${health.daysSinceLastSale} days ago`
              }
            </p>
          </div>
          <div className={`w-2 h-2 rounded-full ${health.activityStatus === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground'} animate-pulse`} />
        </div>

        {/* Row 2: Onboarding Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Onboarding Score</p>
            <p className={`text-sm font-bold font-mono tracking-tight tabular-nums ${health.onboardingScore === 100 ? 'text-emerald-500' : 'text-foreground'}`}>
              {health.onboardingScore}%
            </p>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${health.onboardingScore === 100 ? 'bg-emerald-500' : 'bg-[#E8400C]'}`} 
              style={{ width: `${health.onboardingScore}%` }} 
            />
          </div>
          {health.incompleteSteps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {health.incompleteSteps.map(step => (
                <span key={step} className="px-2 py-0.5 bg-muted/50 border border-border text-muted-foreground text-[9px] font-semibold uppercase tracking-wider rounded">
                  {step}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Feature Adoption */}
        <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Feature Adoption</p>
              <p className="text-xs font-semibold tracking-tight text-muted-foreground font-mono">
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
        <div className={`p-4 rounded-md border transition-all ${riskLevel.color}`}>
          <div className="flex items-center justify-between mb-1">
             <div className="flex items-center gap-2">
               <AlertTriangle className="w-3.5 h-3.5" />
               <span className="text-xs font-bold uppercase tracking-wider">Churn Risk: {riskLevel.label}</span>
             </div>
             <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </div>
          <p className="text-xs opacity-80 font-medium">
            {riskLevel.desc}
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureIcon({ adopted, icon, label }: { adopted: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-2.5 rounded-md border transition-all ${
      adopted 
        ? "bg-accent border-foreground/30 text-foreground shadow-sm" 
        : "bg-muted/30 border-border text-muted-foreground/60"
    }`}>
      {icon}
      <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${adopted ? 'text-[#E8400C]' : ''}`}>
        {label}
      </span>
    </div>
  )
}
