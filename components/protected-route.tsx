"use client"

import { useEffect, useState, useCallback, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
  requiredPermission?: string
}

export function ProtectedRoute({ children, fallback, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading, session, verifySession } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  const [redirectAttempted, setRedirectAttempted] = useState(false)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [showInactiveWarning, setShowInactiveWarning] = useState(false)

  // Session timeout in milliseconds (15 minutes)
  const SESSION_TIMEOUT = 15 * 60 * 1000
  // Warning before timeout (1 minute before)
  const WARNING_BEFORE_TIMEOUT = 1 * 60 * 1000

  // Set isClient to true once component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Verify session is valid (not expired, not tampered with)
  useEffect(() => {
    if (!isLoading && session) {
      const checkSession = async () => {
        const isValid = await verifySession()
        setSessionValid(isValid)

        if (!isValid && !redirectAttempted) {
          console.log("Session invalid, redirecting to login")
          setRedirectAttempted(true)
          const returnPath = encodeURIComponent(pathname)
          router.push(`/login?redirectTo=${returnPath}&reason=session_expired`)
        }
      }

      checkSession()
    }
  }, [isLoading, session, verifySession, redirectAttempted, router, pathname])

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now())
    setShowInactiveWarning(false)
    // Store last activity in localStorage for persistence across tabs
    if (typeof window !== "undefined") {
      localStorage.setItem("lastActivity", Date.now().toString())
    }
  }, [])

  // Set up activity listeners
  useEffect(() => {
    if (isClient && user) {
      // Update activity on user interactions
      const events = ["mousedown", "keypress", "scroll", "touchstart"]
      events.forEach((event) => {
        window.addEventListener(event, updateActivity)
      })

      // Check for inactivity every minute
      const inactivityCheck = setInterval(() => {
        const now = Date.now()
        const timeSinceLastActivity = now - lastActivity

        // Show warning before session timeout
        if (timeSinceLastActivity > SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT) {
          setShowInactiveWarning(true)
        }

        // Redirect to login after session timeout
        if (timeSinceLastActivity > SESSION_TIMEOUT) {
          console.log("Session timeout due to inactivity")
          const returnPath = encodeURIComponent(pathname)
          router.push(`/login?redirectTo=${returnPath}&reason=session_timeout`)
        }
      }, 60000) // Check every minute

      return () => {
        events.forEach((event) => {
          window.removeEventListener(event, updateActivity)
        })
        clearInterval(inactivityCheck)
      }
    }
  }, [isClient, user, updateActivity, lastActivity, router, pathname])

  // Handle authentication check and redirect
  useEffect(() => {
    // Skip if still loading or not client-side yet
    if (isLoading || !isClient) return

    // If no user is found after loading completes, redirect to login
    if (!user && !redirectAttempted) {
      console.log("No authenticated user found, redirecting to login")
      // Encode the current path to redirect back after login
      const returnPath = encodeURIComponent(pathname)
      setRedirectAttempted(true)
      router.push(`/login?redirectTo=${returnPath}`)
    }

    // Check permission if required
    if (user && requiredPermission) {
      // This is where you would check if the user has the required permission
      // For now, we'll just log it since we don't have a permission system yet
      console.log(`Checking if user has permission: ${requiredPermission}`)

      // Example permission check (replace with your actual permission logic)
      const hasPermission = true // user.permissions?.includes(requiredPermission)

      if (!hasPermission && !redirectAttempted) {
        console.log(`User lacks permission: ${requiredPermission}, redirecting to access denied`)
        setRedirectAttempted(true)
        router.push(`/access-denied?permission=${requiredPermission}`)
      }
    }
  }, [user, isLoading, router, pathname, isClient, redirectAttempted, requiredPermission])

  // Show inactivity warning
  if (showInactiveWarning) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <ShieldAlert className="h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-semibold">Session Expiring Soon</h2>
            <p className="text-center text-muted-foreground">
              Your session will expire due to inactivity. Click continue to stay logged in.
            </p>
            <div className="flex gap-4 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  const returnPath = encodeURIComponent(pathname)
                  router.push(`/login?redirectTo=${returnPath}&reason=session_timeout`)
                }}
              >
                Logout
              </Button>
              <Button onClick={updateActivity}>Continue Session</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while checking auth
  if (isLoading || !isClient || sessionValid === null) {
    return (
      fallback || (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying access...</p>
          </div>
        </div>
      )
    )
  }

  // If not authenticated or session is invalid, show a simplified loading state (redirect will happen in useEffect)
  if (!user || sessionValid === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // User is authenticated with valid session, render children
  return <>{children}</>
}
