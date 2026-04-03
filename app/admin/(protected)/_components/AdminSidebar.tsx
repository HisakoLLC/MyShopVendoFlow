"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Building2, 
  MessageCircle, 
  BarChart3, 
  CreditCard, 
  Users, 
  Settings,
  LogOut,
  X
} from "lucide-react"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { hasPermission, Permission } from "@/lib/admin/permissions"
import { useBadges } from "./BadgeContext"

const navigation: { title: string, items: { name: string, href: string, icon: any, permission?: Permission, badgeKey?: "overdue" | "at_risk" }[] }[] = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: 'dashboard' },
      { name: "Merchants", href: "/admin/merchants", icon: Building2, permission: 'merchants_view', badgeKey: "at_risk" },
    ]
  },
  {
    title: "Communications",
    items: [
      { name: "WhatsApp", href: "/admin/whatsapp", icon: MessageCircle, permission: 'whatsapp_view' },
      { name: "Reports", href: "/admin/reports", icon: BarChart3, permission: 'reports_view' },
    ]
  },
  {
    title: "Finance",
    items: [
      { name: "Finance", href: "/admin/finance", icon: CreditCard, permission: 'finance_view', badgeKey: "overdue" },
    ]
  },
  {
    title: "System",
    items: [
      { name: "Staff", href: "/admin/staff", icon: Users, permission: 'staff_manage' },
      { name: "Settings", href: "/admin/settings", icon: Settings, permission: 'settings_manage' },
    ]
  }
]

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { full_name, role } = useAdminUser()
  const supabase = getSupabaseBrowserClient()
  const { overdueCount, atRiskCount } = useBadges()

  const filteredNavigation = navigation.map(section => ({
    ...section,
    items: section.items.filter(item => !item.permission || hasPermission(role, item.permission))
  })).filter(section => section.items.length > 0)

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <aside className="w-56 h-screen flex-shrink-0 bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col">
      {/* Top: Brand */}
      <div className="h-12 flex items-center px-4 gap-2 border-b border-[#1a1a1a] justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-xs tracking-widest uppercase">VendoFlow</span>
          <span className="bg-[#22c55e]/10 text-[#22c55e] text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-sm border border-[#22c55e]/20">
            PRO
          </span>
        </div>
        <button onClick={onClose} className="md:hidden text-[#444] hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {filteredNavigation.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="text-[#333] text-[9px] tracking-[0.3em] uppercase px-6 mb-2 font-black">
              {section.title}
            </h3>
            <div className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))
                const Icon = item.icon
                
                const badge = item.badgeKey === "overdue" ? overdueCount : item.badgeKey === "at_risk" ? atRiskCount : 0
                const badgeColor = item.badgeKey === "overdue" ? "bg-amber-400/20 text-amber-400" : "bg-red-400/20 text-red-400"

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all group ${
                      isActive 
                        ? "text-white bg-white/5 border-l-2 border-[#22c55e] !pl-[14px]" 
                        : "text-[#555] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#22c55e]" : "text-[#333] group-hover:text-[#666]"}`} />
                      {item.name}
                    </div>
                    {badge > 0 && (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${badgeColor}`}>
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: User Info & Logout */}
      <div className="p-6 border-t border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mb-4">
          <p className="text-white text-[10px] font-black uppercase tracking-widest truncate">{full_name}</p>
          <p className="text-[#333] text-[8px] font-black uppercase tracking-[0.2em] truncate mt-1">
            {role.replace("_", " ")}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-[#444] hover:text-white text-[9px] font-black uppercase tracking-[0.2em] transition-colors w-full group"
        >
          <LogOut className="w-3.5 h-3.5 text-[#333] group-hover:text-red-500 transition-colors" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
