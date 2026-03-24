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
  LogOut
} from "lucide-react"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { hasPermission, Permission } from "@/lib/admin/permissions"

const navigation: { title: string, items: { name: string, href: string, icon: any, permission?: Permission }[] }[] = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: 'dashboard' },
      { name: "Merchants", href: "/admin/merchants", icon: Building2, permission: 'merchants_view' },
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
      { name: "Finance", href: "/admin/finance", icon: CreditCard, permission: 'finance_view' },
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

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { full_name, role } = useAdminUser()
  const supabase = getSupabaseBrowserClient()

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
      <div className="h-12 flex items-center px-4 gap-2 border-b border-[#1a1a1a]">
        <span className="text-white font-bold text-sm tracking-tight">VendoFlow</span>
        <span className="bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded">
          Admin
        </span>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filteredNavigation.map((section) => (
          <div key={section.title} className="mb-4">
            <h3 className="text-[#444] text-[10px] tracking-widest uppercase px-4 pt-2 pb-1 font-semibold">
              {section.title}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-4 py-2 mx-2 rounded-sm text-xs font-medium transition-colors group ${
                      isActive 
                        ? "text-white bg-[#1a1a1a] border-l-2 border-[#22c55e] !pl-[14px]" 
                        : "text-[#666] hover:text-white hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#22c55e]" : "text-[#444] group-hover:text-[#666]"}`} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: User Info & Logout */}
      <div className="p-4 border-t border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mb-3">
          <p className="text-white/90 text-[11px] font-medium truncate">{full_name}</p>
          <p className="text-[#444] text-[10px] uppercase tracking-wider truncate">
            {role.replace("_", " ")}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-[#666] hover:text-white text-[10px] font-semibold uppercase tracking-widest transition-colors w-full group"
        >
          <LogOut className="w-3 h-3 text-[#444] group-hover:text-white" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
