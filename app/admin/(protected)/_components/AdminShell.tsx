"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Toaster } from "sonner"
import AdminSidebar from "./AdminSidebar"
import AdminTopbar from "./AdminTopbar"
import { BadgeProvider } from "./BadgeContext"

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isWhatsapp = pathname === "/admin/whatsapp"
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <BadgeProvider>
      <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden relative">
        <Toaster position="bottom-right" />
        
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar — hidden on mobile unless open */}
        <div className={`
          fixed left-0 top-0 z-40 h-full transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:block
        `}>
          <AdminSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Right: topbar + scrollable content */}
        <div className="flex flex-col flex-1 md:ml-0 min-w-0 overflow-hidden">
          <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />
          <main className={`flex-1 flex flex-col min-h-0 px-4 py-4 md:px-8 md:py-8 ${isWhatsapp ? '!p-0' : 'overflow-y-auto'}`}>
            {children}
          </main>
        </div>
      </div>
    </BadgeProvider>
  )
}
