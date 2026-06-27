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
    <header className="h-14 bg-card border-b border-border px-6 flex items-center justify-between shrink-0 font-sans">
      {/* Left: Dynamic Title */}
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="md:hidden mr-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-foreground text-base font-bold tracking-tight">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right: User Profile */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${colors.bg}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wider ${colors.text}`}>
            {role.replace("_", " ")}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-border" />

        {/* User Info */}
        <div className="flex items-center gap-2.5">
          <span className="text-foreground text-xs font-semibold">{full_name}</span>
          <div className="w-7 h-7 rounded-full bg-accent border border-border flex items-center justify-center">
            <span className="text-foreground text-xs font-bold">{initial}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
