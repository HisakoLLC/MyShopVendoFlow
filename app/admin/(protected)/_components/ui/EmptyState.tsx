import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-sm bg-muted/20 opacity-60">
      <Icon className="w-8 h-8 text-muted-foreground/40 mb-3" />
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{title}</p>
      <p className="text-[10px] text-muted-foreground/70 mt-2 font-bold uppercase tracking-widest max-w-[240px] leading-relaxed italic">{description}</p>
    </div>
  )
}
