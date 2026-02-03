import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    href?: string
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      {Icon && (
        <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
          <Icon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="rounded-xl border border-zinc-200 bg-background dark:border-zinc-800 dark:bg-background">
      {content}
    </div>
  )
}
