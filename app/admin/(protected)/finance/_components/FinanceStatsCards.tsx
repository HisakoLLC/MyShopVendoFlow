import { CreditCard, TrendingUp, Users, AlertTriangle } from "lucide-react"
import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"

interface FinanceStatsCardsProps {
  stats: any
  loading: boolean
}

export function FinanceStatsCards({ stats, loading }: FinanceStatsCardsProps) {
  const cards = [
    {
      label: "Card Revenue (Dodo)",
      value: `USD ${stats?.saas?.cardRevenue?.toLocaleString() || '0'}`,
      sub: `${stats?.saas?.activeSubscribers || 0} active subscribers`,
      icon: CreditCard,
      color: "text-primary"
    },
    {
      label: "M-Pesa & Wire (This Month)",
      value: `KES ${stats?.saas?.manualRevenue?.toLocaleString() || '0'}`,
      sub: "Manual billing cycle",
      icon: TrendingUp,
      color: "text-foreground"
    },
    {
      label: "Outstanding Invoices",
      value: `KES ${stats?.saas?.outstandingKES?.toLocaleString() || '0'}`,
      sub: "Awaiting settlement",
      icon: AlertTriangle,
      color: (stats?.saas?.outstandingKES || 0) > 0 ? "text-amber-500" : "text-muted-foreground"
    },
    {
      label: "Overdue Invoices",
      value: stats?.saas?.overdueCount || 0,
      sub: "Action required",
      icon: AlertTriangle,
      color: (stats?.saas?.overdueCount || 0) > 0 ? "text-red-500" : "text-muted-foreground"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div key={i} className="p-8 bg-card border border-border rounded-sm group hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{card.label}</span>
            <card.icon className={`w-4 h-4 ${card.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
          </div>
          {loading ? (
            <div className="space-y-3">
              <LoadingSkeleton className="h-8 w-3/4" />
              <LoadingSkeleton className="h-3 w-1/2" />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-2xl font-black text-foreground tracking-tighter">{card.value}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed italic">{card.sub}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
