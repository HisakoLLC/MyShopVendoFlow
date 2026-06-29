import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"

interface PlanBreakdownGridProps {
  breakdown: any
  loading: boolean
}

export function PlanBreakdownGrid({ breakdown, loading }: PlanBreakdownGridProps) {
  const plans = ["starter", "core", "scale", "enterprise"]
  const statuses = ["active", "trialing", "past_due", "suspended"]

  if (loading) {
     return (
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
           <LoadingSkeleton key={i} className="h-16 w-full" />
         ))}
       </div>
     )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {plans.map(plan => (
        <div key={plan} className="space-y-2 p-4 bg-card border border-border rounded-sm">
           <div className="text-[9px] font-black text-foreground uppercase tracking-[0.2em] mb-3">{plan}</div>
           <div className="space-y-2">
              {statuses.map(status => {
                const count = breakdown[`${plan}:${status}`] || 0
                return (
                  <div key={status} className="flex items-center justify-between">
                     <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{status}</span>
                     <span className={`text-[10px] font-bold ${count > 0 ? 'text-primary' : 'text-muted-foreground/30'}`}>{count}</span>
                  </div>
                )
              })}
           </div>
        </div>
      ))}
    </div>
  )
}
