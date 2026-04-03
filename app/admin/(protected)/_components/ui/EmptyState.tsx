import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[#1a1a1a] rounded-sm bg-white/5 opacity-50">
      <Icon className="w-8 h-8 text-[#333] mb-3" />
      <p className="text-[10px] font-black text-[#555] uppercase tracking-[0.3em]">{title}</p>
      <p className="text-[10px] text-[#444] mt-2 font-bold uppercase tracking-widest max-w-[240px] leading-relaxed italic">{description}</p>
    </div>
  )
}
