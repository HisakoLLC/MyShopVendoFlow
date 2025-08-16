"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Logo } from "@/components/logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const auth = useAuth()
  // Safe auth access with fallback
  const user = auth?.user || null
  const signOut = auth?.signOut || (async () => {})

  // Load collapsed state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed")
    if (savedState !== null) {
      setIsCollapsed(savedState === "true")
    }
  }, [])

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed.toString())
  }, [isCollapsed])

  const toggleSidebar = () => setIsOpen(!isOpen)
  const toggleCollapsed = () => setIsCollapsed(!isCollapsed)
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  const handleLogout = async () => {
    if (signOut) {
      await signOut()
    }
  }

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/sales",
      label: "Sales",
      icon: ShoppingCart,
    },
    {
      href: "/inventory",
      label: "Inventory",
      icon: Package,
    },
    {
      href: "/purchases",
      label: "Purchases",
      icon: Truck,
    },
    {
      href: "/expenses",
      label: "Expenses",
      icon: Receipt,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 md:hidden" onClick={toggleSidebar}>
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar for desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 bg-background border-r transform transition-all duration-300 ease-in-out
          md:translate-x-0 md:static md:h-screen
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "md:w-16" : "md:w-64"}
        `}
      >
        <TooltipProvider>
          <div className="flex flex-col h-full">
            <div className={`p-2 border-b flex ${isCollapsed ? "justify-center" : "justify-between"} items-center`}>
              <Logo iconOnly={isCollapsed} className={isCollapsed ? "h-8 w-auto" : "h-10 w-auto"} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCollapsed}
                    className={`${isCollapsed ? "ml-0" : "ml-2"} hidden md:flex h-8 w-8 p-0`}
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
              </Tooltip>
            </div>

            <nav className={`flex-1 ${isCollapsed ? "p-2" : "p-4"} space-y-1 overflow-y-auto`}>
              {routes.map((route) => {
                const isActive = pathname === route.href
                const Icon = route.icon

                return (
                  <Tooltip key={route.href} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Link
                        href={route.href}
                        className={`
                          flex items-center ${
                            isCollapsed ? "px-2 py-2" : "px-4 py-3"
                          } text-sm rounded-md transition-colors
                          ${isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}
                          ${isCollapsed ? "justify-center" : ""}
                          ${isActive && !isCollapsed ? "border-l-4 border-primary" : ""}
                        `}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon className={`${isCollapsed ? "" : "mr-3"} h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                        {!isCollapsed && route.label}
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">{route.label}</TooltipContent>}
                  </Tooltip>
                )
              })}
            </nav>

            <div className={`${isCollapsed ? "p-2" : "p-4"} border-t flex flex-col gap-2`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className={`${isCollapsed ? "w-8 h-8" : "w-full"} flex items-center justify-center`}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {!isCollapsed && <span className="ml-2">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">{theme === "dark" ? "Light Mode" : "Dark Mode"}</TooltipContent>
                )}
              </Tooltip>

              {user && (
                <>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleLogout}
                          className="w-8 h-8 flex items-center justify-center text-red-500"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">Log out</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center text-red-500"
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      Log out
                    </Button>
                  )}
                </>
              )}

              {user && !isCollapsed && (
                <div className="flex items-center mt-2 px-2">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate max-w-[120px]">{user?.email}</span>
                </div>
              )}
            </div>
          </div>
        </TooltipProvider>
      </div>
    </>
  )
}
