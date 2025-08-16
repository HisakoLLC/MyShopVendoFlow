"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/lib/auth-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  // Close sidebar when path changes (mobile navigation)
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  // Check if this is an auth page
  const isAuthPage =
    pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname?.startsWith("/reset-password")

  // Don't show sidebar on auth pages
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  // For non-auth pages, show the dashboard layout with sidebar
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}
