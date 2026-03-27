"use client"

import { Toaster } from "sonner"
import { usePathname } from "next/navigation"
import AdminSidebar from "./AdminSidebar"
import AdminTopbar from "./AdminTopbar"

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isWhatsapp = pathname === "/admin/whatsapp"

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Toaster position="bottom-right" />
      {/* Fixed left sidebar */}
      <AdminSidebar />

      {/* Right: topbar + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminTopbar />
        <main className={`flex-1 flex flex-col min-h-0 ${isWhatsapp ? 'p-0' : 'p-6 overflow-y-auto'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
