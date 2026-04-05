"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart2,
  Package,
  Boxes,
  ClipboardList,
  Users,
  Settings,
  UserCog,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import { getRoleFromUser, canShowNavItem, getRoleLabel, type StaffRole } from "@/lib/auth/roles"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: BarChart2 },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/purchasing", label: "Purchasing", icon: ClipboardList },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/staff", label: "Staff", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
]

function getUserDisplayName(user: User | null): string {
  if (!user) return "User"
  
  // Check if user is staff (has is_staff metadata)
  if (user.user_metadata?.is_staff === true) {
    // Staff user - could fetch role from API, but for now just show "Staff"
    return "Staff"
  }
  
  // Account owner
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

function Sidebar({
  user,
  role,
  storeName,
  isExpanded,
  setIsExpanded,
  onSignOut,
}: {
  user: User | null
  role: StaffRole
  storeName: string
  isExpanded: boolean
  setIsExpanded: (val: boolean) => void
  onSignOut: () => void
}) {
  const pathname = usePathname()
  const visibleNavItems = navItems.filter((item) => canShowNavItem(item.href, role))

  const displayName = getUserDisplayName(user)
  const initials = getInitials(user)
  const userRoleLabel = getRoleLabel(role)

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const handleSignOut = () => {
    onSignOut()
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 240 : 60 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "bg-zinc-950 border-r border-zinc-800 h-full flex flex-col relative z-40 transition-shadow duration-300 shrink-0",
        !isExpanded && "shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
      )}
    >
      {/* Logo area */}
      <div className="px-5 py-5 border-b border-zinc-800 flex items-center justify-between min-h-[73px]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img src="/favicon.svg" alt="VendoFlow Logo" className="w-7 h-7 shrink-0" />
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-editorial text-lg font-bold text-zinc-50 whitespace-nowrap"
              >
                VendoFlow
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-10 bg-zinc-950 border-y border-r border-zinc-800 rounded-r-md flex items-center justify-center text-zinc-500 hover:text-zinc-100 transition-colors z-50 group/toggle"
      >
        {isExpanded ? (
          <ChevronsLeft className="w-4 h-4 group-hover/toggle:-translate-x-0.5 transition-transform" />
        ) : (
          <ChevronsRight className="w-4 h-4 group-hover/toggle:translate-x-0.5 transition-transform" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {visibleNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "group relative flex items-center gap-3 py-2.5 text-xs font-semibold tracking-[0.1em] uppercase transition-all duration-150 rounded-md mx-2",
              isExpanded ? "px-4" : "px-0 justify-center",
              isActive(href)
                ? "bg-zinc-800 border-l-2 border-l-zinc-600 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50"
            )}
          >
            <Icon className={cn("w-4 h-4 shrink-0 transition-transform duration-200", !isExpanded && "group-hover:scale-110")} />
            
            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="whitespace-nowrap"
                >
                  {label}
                </motion.span>
              ) : (
                /* Tooltip for collapsed state */
                <span className="absolute left-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bg-zinc-800 text-zinc-100 text-[0.65rem] py-1 px-3 rounded shadow-xl border border-zinc-700 whitespace-nowrap z-[100] translate-x-1 group-hover:translate-x-0">
                  {label}
                </span>
              )}
            </AnimatePresence>
          </Link>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className="mt-auto px-5 py-4 border-t border-zinc-800 min-h-[69px] overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 shrink-0 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <span className="text-xs font-medium text-zinc-400">
              {initials}
            </span>
          </div>
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-semibold text-zinc-300 truncate">
                  {displayName}
                </p>
                <p className="text-[0.65rem] tracking-[0.1em] uppercase text-zinc-600 truncate">{userRoleLabel}</p>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-0 py-2 w-full text-[0.65rem] font-semibold tracking-[0.1em] uppercase text-zinc-600 hover:text-red-400 hover:bg-red-500/5 rounded-sm transition-colors mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}

const noSidebarPaths = ["/", "/login", "/signup", "/onboarding", "/suspended"]

const STORE_ID_KEY = "vendoflow_last_store_id"
const STORE_NAME_KEY = "vendoflow_last_store_name"
const ACCOUNT_ID_KEY = "vendoflow_last_account_id"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminMode = process.env.NEXT_PUBLIC_APP_MODE === 'admin'

  // If in admin mode, bypass the merchant AppShell entirely
  if (isAdminMode) {
    return <>{children}</>
  }

  const [isExpanded, setIsExpanded] = React.useState(true)
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

  // Persist current store/account and role when any user (owner or staff) is logged in.
  const [role, setRole] = React.useState<StaffRole | null>(null)
  const [storeCount, setStoreCount] = React.useState(0)
  const [storeName, setStoreName] = React.useState("")
  React.useEffect(() => {
    if (!user) {
      setRole(null)
      setStoreCount(0)
      return
    }
    let cancelled = false
    fetch("/api/current-store", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          current_store?: { store_id: string; name: string } | null
          all_stores?: { store_id: string; name: string }[]
          account_id?: string | null
          role?: StaffRole
        } | null) => {
          if (cancelled || !data) return
          if (data.role) setRole(data.role)
          if (Array.isArray(data.all_stores)) setStoreCount(data.all_stores.length)
          if (data.current_store) {
            try {
              localStorage.setItem(STORE_ID_KEY, data.current_store.store_id)
              if (data.current_store.name) {
                localStorage.setItem(STORE_NAME_KEY, data.current_store.name)
                setStoreName(data.current_store.name)
              }
              if (data.account_id) {
                localStorage.setItem(ACCOUNT_ID_KEY, data.account_id)
              }
            } catch {
              // ignore
            }
          }
        }
      )
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const showSidebar = !noSidebarPaths.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
  )

  if (!showSidebar) {
    return <>{children}</>
  }

  // Use role from API when available; fallback to getRoleFromUser for initial render
  const effectiveRole: StaffRole = role ?? getRoleFromUser(user)

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 overflow-hidden">
      <Sidebar
        user={user}
        role={effectiveRole}
        storeName={storeName}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        onSignOut={async () => {
          await supabase.auth.signOut()
          window.location.href = "/login"
        }}
      />
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
