"use client"

import { usePathname } from "next/navigation"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import { Menu } from "lucide-react"

const pageTitleMap: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/merchants": "Merchants",
  "/admin/whatsapp": "WhatsApp Support",
  "/admin/reports": "Operational Reports",
  "/admin/finance": "Financial Overview",
  "/admin/staff": "Staff Management",
  "/admin/settings": "System Settings",
}

const roleColors: Record<string, { bg: string; text: string; dot: string }> = {
  super_admin: { bg: "bg-green-500/10", text: "text-green-500", dot: "bg-green-500" },
  finance: { bg: "bg-blue-500/10", text: "text-blue-500", dot: "bg-blue-500" },
  support: { bg: "bg-yellow-500/10", text: "text-yellow-500", dot: "bg-yellow-500" },
  reporting: { bg: "bg-purple-500/10", text: "text-purple-500", dot: "bg-purple-500" },
}

export default function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const { full_name, role } = useAdminUser()

  // Find exact match or partial match for dynamic routes (like /admin/merchants/[id])
  const getPageTitle = (path: string) => {
    if (pageTitleMap[path]) return pageTitleMap[path]
    if (path.startsWith("/admin/merchants/")) return "Merchant Detail"
    return "Admin Console"
  }

  const colors = roleColors[role] || roleColors.support
  const initial = full_name?.charAt(0).toUpperCase() || "A"

  return (
    <header className="h-12 bg-[#0d0d0d] border-b border-[#1a1a1a] px-6 flex items-center justify-between shrink-0">
      {/* Left: Dynamic Title */}
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="md:hidden mr-3 text-[#666] hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-white text-sm font-semibold tracking-tight">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right: User Profile */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${colors.bg}`}>
          <div className={`w-1 h-1 rounded-full ${colors.dot}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wider ${colors.text}`}>
            {role.replace("_", " ")}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#1a1a1a]" />

        {/* User Info */}
        <div className="flex items-center gap-2.5">
          <span className="text-white/80 text-xs font-medium">{full_name}</span>
          <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <span className="text-white text-[11px] font-bold">{initial}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
