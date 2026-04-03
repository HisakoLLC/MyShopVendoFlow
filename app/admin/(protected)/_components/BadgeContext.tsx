"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useAdminUser } from "@/lib/admin/AdminUserContext"

interface BadgeContextType {
  overdueCount: number
  atRiskCount: number
  refreshBadges: () => Promise<void>
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined)

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [overdueCount, setOverdueCount] = useState(0)
  const [atRiskCount, setAtRiskCount] = useState(0)
  const { id } = useAdminUser()

  const refreshBadges = async () => {
    if (!id) return
    try {
      const res = await fetch("/api/admin/nav-badges")
      const data = await res.json()
      setOverdueCount(data.overdueInvoicesCount || 0)
      setAtRiskCount(data.atRiskMerchantsCount || 0)
    } catch (err) {
      console.error("Badge sync failed", err)
    }
  }

  useEffect(() => {
    refreshBadges()
    // Refresh every 5 minutes
    const interval = setInterval(refreshBadges, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [id])

  return (
    <BadgeContext.Provider value={{ overdueCount, atRiskCount, refreshBadges }}>
      {children}
    </BadgeContext.Provider>
  )
}

export function useBadges() {
  const context = useContext(BadgeContext)
  if (context === undefined) {
    throw new Error("useBadges must be used within a BadgeProvider")
  }
  return context
}
