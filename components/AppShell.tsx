"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
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
  Moon,
  Sun,
  Monitor,
  FileText,
  HelpCircle,
  LogOut,
  CheckCircle2,
  UserCog,
} from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/purchasing", label: "Purchasing", icon: Truck },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/staff", label: "Staff", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
]

function getUserDisplayName(user: User | null): string {
  if (!user) return "User"
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0]
  return name || "User"
}

function getUserAvatarUrl(user: User | null): string | null {
  if (!user) return null
  return user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
}

function getInitials(user: User | null): string {
  const name = getUserDisplayName(user)
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  }
  return name.slice(0, 2).toUpperCase()
}

function SidebarUser({
  user,
  collapsed,
}: {
  user: User | null
  collapsed: boolean
}) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const displayName = getUserDisplayName(user)
  const avatarUrl = getUserAvatarUrl(user)
  const initials = getInitials(user)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
              collapsed && "justify-center px-0"
            )}
            aria-label="Account menu"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                {initials}
              </div>
            )}
            {!collapsed && (
              <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">
                {displayName}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{displayName}</p>
              {user?.email && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {mounted && (
            <>
              <DropdownMenuLabel className="text-xs text-zinc-500 dark:text-zinc-400">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setTheme("light")
                }}
                className="cursor-pointer"
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setTheme("dark")
                }}
                className="cursor-pointer"
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setTheme("system")
                }}
                className="cursor-pointer"
              >
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <a
              href="https://vendoflow.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4" />
              Docs
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://vendoflow.com/help"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
            <span>Platform status: All systems normal</span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleLogout}
            className="cursor-pointer text-zinc-700 focus:text-red-600 dark:text-zinc-300 dark:focus:text-red-400"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Sidebar({
  collapsed,
  onToggle,
  user,
}: {
  collapsed: boolean
  onToggle: () => void
  user: User | null
}) {
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
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href)) ||
            (href === "/purchasing" && pathname.startsWith("/purchasing"))
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
      <SidebarUser user={user} collapsed={collapsed} />
    </aside>
  )
}

const noSidebarPaths = ["/", "/login", "/signup", "/onboarding"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    void supabase.auth.getUser().then((res: { data: { user: User | null } }) =>
      setUser(res.data.user ?? null)
    )
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const showSidebar = !noSidebarPaths.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
  )

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        user={user}
      />
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
