"use client"

import * as React from "react"
import Link from "next/link"
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format-currency"

function useCountUp(end: number, durationMs = 1000, enabled = true) {
  const [value, setValue] = React.useState(0)
  const startRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!enabled) {
      setValue(end)
      return
    }
    setValue(0)
    startRef.current = null
    let rafId: number

    const tick = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / durationMs, 1)
      // easeOutQuart
      const eased = 1 - (1 - progress) ** 4
      setValue(Math.round(eased * end))
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [end, durationMs, enabled])

  return value
}

type CardVariant = "revenue" | "transactions" | "units" | "alerts"

const iconMap: Record<CardVariant, { Icon: LucideIcon; bg: string; text: string }> = {
  revenue: {
    Icon: DollarSign,
    bg: "bg-success-500/10 dark:bg-success-500/20",
    text: "text-success-600 dark:text-success-400",
  },
  transactions: {
    Icon: ShoppingCart,
    bg: "bg-primary-100 dark:bg-primary-900/50",
    text: "text-primary-600 dark:text-primary-400",
  },
  units: {
    Icon: Package,
    bg: "bg-primary-100 dark:bg-primary-900/50",
    text: "text-primary-600 dark:text-primary-400",
  },
  alerts: {
    Icon: AlertTriangle,
    bg: "bg-danger-500/10 dark:bg-danger-500/20",
    text: "text-danger-600 dark:text-danger-400",
  },
}

export interface DashboardStatCardProps {
  variant: CardVariant
  value: number
  label: string
  /** e.g. "+12.5%" or "+8" */
  trend?: string
  trendUp?: boolean
  /** e.g. "KES 21,650 yesterday" */
  comparison?: string
  /** For alerts card: link to intelligence */
  href?: string
  /** Red border when count > 5 (alerts) */
  alertBorder?: boolean
  /** Format as currency (revenue) */
  formatAsCurrency?: boolean
}

export function DashboardStatCard({
  variant,
  value,
  label,
  trend,
  trendUp = true,
  comparison,
  href,
  alertBorder = false,
  formatAsCurrency = false,
}: DashboardStatCardProps) {
  const displayValue = useCountUp(value, 1000)
  const { Icon, bg, text } = iconMap[variant]
  const formattedValue = formatAsCurrency
    ? formatCurrency(displayValue)
    : String(displayValue)

  const content = (
    <>
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            bg,
            text
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {trend != null && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              trendUp
                ? "bg-success-500/10 text-success-700 dark:text-success-400"
                : "bg-danger-500/10 text-danger-700 dark:text-danger-400"
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
        {formattedValue}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{label}</p>
      {comparison && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">
          {comparison}
        </p>
      )}
    </>
  )

  const cardClass = cn(
    "rounded-xl border border-slate-200 bg-gradient-to-b from-white to-primary-50/5 p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:from-slate-900 dark:to-primary-950/20",
    alertBorder &&
      "border-danger-300 dark:border-danger-700 ring-1 ring-danger-200 dark:ring-danger-800"
  )

  if (href) {
    return (
      <Link href={href} className={cn("block", cardClass, "hover:scale-[1.02]")}>
        {content}
      </Link>
    )
  }

  return <div className={cn(cardClass, "hover:scale-[1.02]")}>{content}</div>
}
