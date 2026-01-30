"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  TrendingUp,
  ShoppingBag,
  Users,
  Settings,
  Menu,
  Sparkles,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  FileText,
  HelpCircle,
  LogOut,
  CheckCircle2,
  UserCog,
  Store,
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"

// ——— Nav structure: Operations, Management, Divider, Settings ———
const operationsNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/pos",
    label: "POS",
    icon: ShoppingCart,
    badge: "Quick Access",
  },
] as const

const managementNav = [
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/sales", label: "Sales", icon: TrendingUp },
  { href: "/purchasing", label: "Purchasing", icon: ShoppingBag },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/staff", label: "Staff", icon: UserCog },
  { href: "/stores", label: "Stores", icon: Store },
] as const

const settingsNav = [{ href: "/settings", label: "Settings", icon: Settings }] as const

function isActive(href: string, pathname: string): boolean {
  if (pathname === href) return true
  if (href === "/dashboard") return false
  if (href === "/settings") return pathname.startsWith("/settings")
  if (href === "/staff") return pathname.startsWith("/settings/staff")
  if (href === "/stores") return pathname === "/stores" || pathname.startsWith("/settings/stores")
  return pathname.startsWith(href)
}

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

// ——— Shared nav link (used in sidebar and mobile drawer) ———
function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  pathname,
  onClick,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  pathname: string
  onClick?: () => void
}) {
  const active = isActive(href, pathname)
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
        "border-l-4 border-transparent",
        active
          ? "border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/50 dark:text-primary-300"
          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
        badge && "relative"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{label}</span>
      {badge && (
        <span className="shrink-0 rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-700 dark:bg-secondary-900/50 dark:text-secondary-300">
          {badge}
        </span>
      )}
    </Link>
  )
}

// ——— Nav content (sidebar body): sections + optional quick stats ———
function NavContent({
  pathname,
  onNavClick,
  showQuickStats = true,
}: {
  pathname: string
  onNavClick?: () => void
  showQuickStats?: boolean
}) {
  return (
    <>
      {/* Operations */}
      <section className="mb-6">
        <h2 className="mb-2 px-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Operations
        </h2>
        <div className="space-y-1">
          {operationsNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              pathname={pathname}
              onClick={onNavClick}
            />
          ))}
        </div>
      </section>

      {/* Management */}
      <section className="mb-6">
        <h2 className="mb-2 px-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Management
        </h2>
        <div className="space-y-1">
          {managementNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              pathname={pathname}
              onClick={onNavClick}
            />
          ))}
        </div>
      </section>

      {/* Quick stats (collapsible on small) */}
      {showQuickStats && (
        <div className="mb-6 hidden lg:block">
          <div className="rounded-lg bg-primary-50 p-3 dark:bg-primary-950/40">
            <p className="text-xs font-medium text-primary-800 dark:text-primary-200">
              Today&apos;s Sales
            </p>
            <p className="mt-0.5 text-lg font-semibold text-primary-700 dark:text-primary-300">
              KES 12,450
            </p>
          </div>
        </div>
      )}

      {/* Divider + Settings */}
      <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
      <section>
        <div className="space-y-1">
          {settingsNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              pathname={pathname}
              onClick={onNavClick}
            />
          ))}
        </div>
      </section>
    </>
  )
}

// ——— User profile block (bottom of sidebar) ———
function SidebarUser({
  user,
}: {
  user: User | null
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
    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            aria-label="Account menu"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {displayName}
              </p>
              {user?.email && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{displayName}</p>
              {user?.email && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {mounted && (
            <>
              <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
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
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
            <span>Platform status: All systems normal</span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleLogout}
            className="cursor-pointer text-slate-700 focus:text-danger-500 dark:text-slate-300 dark:focus:text-danger-400"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ——— Desktop sidebar (280px, white + gradient, sections, profile) ———
function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
        "bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-950 dark:to-slate-900/80",
        "md:flex"
      )}
    >
      {/* Logo */}
      <div className="pb-8 pt-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <span
            className="font-bold text-2xl bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent"
          >
            VendoFlow
          </span>
        </Link>
      </div>

      {/* Nav + quick stats */}
      <nav className="flex-1 overflow-y-auto -mx-2 px-2">
        <NavContent pathname={pathname} showQuickStats />
      </nav>

      {/* User profile */}
      <div className="shrink-0 -mx-2 px-2">
        <SidebarUser user={user} />
      </div>
    </aside>
  )
}

// ——— Mobile header (hamburger + logo) ———
function MobileHeader({ user }: { user: User | null }) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-[280px] max-w-[85vw] flex-col border-r border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="font-bold text-xl bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                VendoFlow
              </span>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-4">
              <NavContent
                pathname={pathname}
                onNavClick={() => setOpen(false)}
                showQuickStats={false}
              />
            </nav>
            <div className="border-t border-slate-200 px-2 py-4 dark:border-slate-800">
              <SidebarUser user={user} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 min-w-0"
      >
        <span className="font-bold text-lg bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent truncate">
          VendoFlow
        </span>
      </Link>
    </header>
  )
}

const noSidebarPaths = ["/", "/login", "/signup", "/onboarding"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar user={user} />
      <MobileHeader user={user} />
      <main className="min-h-screen md:ml-[280px]">
        {children}
      </main>
    </div>
  )
}
