"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Boxes,
  Truck,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/purchasing/restock", label: "Purchasing", icon: Truck },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
]

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-200 bg-white transition-[width] dark:border-zinc-800 dark:bg-zinc-950",
        collapsed ? "w-[4rem]" : "w-56"
      )}
    >
      <div className="flex h-14 items-center border-b border-zinc-200 px-3 dark:border-zinc-800">
        {!collapsed && (
          <Link href="/dashboard" className="font-semibold text-zinc-900 dark:text-zinc-100">
            VendoFlow
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto shrink-0", collapsed && "mx-auto")}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href)) ||
            (href === "/purchasing/restock" && pathname.startsWith("/purchasing"))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

const noSidebarPaths = ["/", "/login", "/signup", "/onboarding"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const showSidebar = !noSidebarPaths.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
  )

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className={cn(
          "min-h-screen transition-[margin]",
          collapsed ? "ml-16" : "ml-56"
        )}
      >
        {children}
      </main>
    </div>
  )
}
