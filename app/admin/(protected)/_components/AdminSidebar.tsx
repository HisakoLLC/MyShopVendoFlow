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
    await import("@/app/admin/(auth)/login/actions").then(m => m.signOutAdmin())
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <aside className="w-56 h-screen flex-shrink-0 bg-card border-r border-border flex flex-col font-sans">
      {/* Top: Brand */}
      <div className="h-14 flex items-center px-4 gap-2 border-b border-border justify-between">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-bold text-sm tracking-tight">VendoFlow</span>
          <span className="bg-[#E8400C]/10 text-[#E8400C] text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md border border-[#E8400C]/20">
            PRO
          </span>
        </div>
        <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {filteredNavigation.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="text-muted-foreground/60 text-[9px] tracking-[0.25em] uppercase px-6 mb-2 font-bold">
              {section.title}
            </h3>
            <div className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))
                const Icon = item.icon
                
                const badge = item.badgeKey === "overdue" ? overdueCount : item.badgeKey === "at_risk" ? atRiskCount : 0
                const badgeColor = item.badgeKey === "overdue" ? "bg-amber-500/20 text-amber-500" : "bg-destructive/20 text-destructive"

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold tracking-wide transition-all group ${
                      isActive 
                        ? "text-[#E8400C] bg-[#E8400C]/10 border-l-2 border-[#E8400C] !pl-[12px]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#E8400C]" : "text-muted-foreground group-hover:text-foreground"}`} />
                      {item.name}
                    </div>
                    {badge > 0 && (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-mono ${badgeColor}`}>
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
      <div className="p-4 border-t border-border bg-card">
        <div className="mb-3">
          <p className="text-foreground text-xs font-semibold truncate">{full_name}</p>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider truncate mt-0.5">
            {role.replace("_", " ")}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs font-semibold tracking-wide transition-colors w-full group cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
