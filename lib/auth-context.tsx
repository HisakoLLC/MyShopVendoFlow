"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any; data: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  verifySession: () => Promise<boolean>
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Session storage keys
const SESSION_LAST_CHECKED_KEY = "auth_session_last_checked"
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  // Verify the session is valid with Supabase
  const verifySession = useCallback(async (): Promise<boolean> => {
    if (!supabase || !session) return false

    try {
      // Check if we've verified recently to avoid too many API calls
      const lastChecked = localStorage.getItem(SESSION_LAST_CHECKED_KEY)
      const now = Date.now()

      if (lastChecked && now - Number.parseInt(lastChecked) < SESSION_CHECK_INTERVAL) {
        return true
      }

      // Verify with Supabase
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        console.error("Session verification failed:", error?.message || "No user found")
        return false
      }

      // Update last checked time
      localStorage.setItem(SESSION_LAST_CHECKED_KEY, now.toString())
      return true
    } catch (error) {
      console.error("Error verifying session:", error)
      return false
    }
  }, [supabase, session])

  // Refresh the session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false

    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error || !data.session) {
        console.error("Session refresh failed:", error?.message || "No session returned")
        return false
      }

      setSession(data.session)
      setUser(data.session.user)
      return true
    } catch (error) {
      console.error("Error refreshing session:", error)
      return false
    }
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    // Skip if Supabase client isn't available
    if (!supabase) {
      console.error("Supabase client not available")
      setIsLoading(false)
      return
    }

    const getSession = async () => {
      setIsLoading(true)
      try {
        console.log("Fetching session from Supabase...")
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          setSession(null)
          setUser(null)
        } else {
          console.log("Session retrieved:", session ? "Yes" : "No")
          setSession(session)
          setUser(session?.user || null)

          // If user is logged in and we're on an auth page, redirect to dashboard
          if (
            session &&
            (pathname === "/login" || pathname === "/signup" || pathname === "/reset-password" || pathname === "/")
          ) {
            router.push("/dashboard")
          }
        }
      } catch (error) {
        console.error("Error getting session:", error)
        setSession(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)

      if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed successfully")
      }

      if (event === "SIGNED_OUT") {
        // Clear any stored session data
        localStorage.removeItem(SESSION_LAST_CHECKED_KEY)

        // Show toast notification
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
        })
      }

      setSession(session)
      setUser(session?.user || null)

      // If user is logged in and we're on an auth page, redirect to dashboard
      if (
        session &&
        (pathname === "/login" || pathname === "/signup" || pathname === "/reset-password" || pathname === "/")
      ) {
        router.push("/dashboard")
      }
    })

    // Set up session refresh interval
    const refreshInterval = setInterval(
      async () => {
        if (session) {
          const success = await refreshSession()
          if (!success) {
            console.warn("Failed to refresh session, user may need to re-authenticate")
          }
        }
      },
      30 * 60 * 1000,
    ) // Refresh every 30 minutes

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [router, supabase, pathname, toast, refreshSession])

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) return { error: new Error("Supabase client not available") }

      setIsLoading(true)
      console.log("Attempting to sign in with:", email)

      // Clear any existing session first to prevent conflicts
      await supabase.auth.signOut()

      const { error, data } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error("Sign in error:", error.message)
        return { error }
      }

      console.log("Sign in successful, user:", data.user?.email)

      // Force a session refresh to ensure we have the latest session data
      const { data: sessionData } = await supabase.auth.getSession()
      setSession(sessionData.session)
      setUser(sessionData.session?.user || null)

      // Set initial session check time
      localStorage.setItem(SESSION_LAST_CHECKED_KEY, Date.now().toString())

      // Use a small timeout to ensure state is updated before redirect
      setTimeout(() => {
        router.push("/dashboard")
      }, 100)

      return { error: null }
    } catch (error) {
      console.error("Error signing in:", error)
      return { error }
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      if (!supabase) return { error: new Error("Supabase client not available"), data: null }

      console.log("Attempting to sign up with:", email)
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        console.error("Sign up error:", error.message)
      } else {
        console.log("Sign up successful, user:", data.user?.email)
        toast({
          title: "Account created",
          description: "Your account has been created successfully. Please check your email for verification.",
        })
      }

      return { data, error }
    } catch (error) {
      console.error("Error signing up:", error)
      return { error, data: null }
    }
  }

  const signOut = async () => {
    try {
      if (!supabase) return

      console.log("Signing out user")
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)

      // Clear any stored session data
      localStorage.removeItem(SESSION_LAST_CHECKED_KEY)

      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Sign out error",
        description: "There was a problem signing you out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetPassword = async (email: string) => {
    try {
      if (!supabase) return { error: new Error("Supabase client not available") }

      console.log("Requesting password reset for:", email)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        console.error("Password reset error:", error.message)
        toast({
          title: "Password reset failed",
          description: error.message || "Failed to send password reset email.",
          variant: "destructive",
        })
      } else {
        console.log("Password reset email sent")
        toast({
          title: "Password reset email sent",
          description: "Please check your email for instructions to reset your password.",
        })
      }

      return { error }
    } catch (error) {
      console.error("Error resetting password:", error)
      return { error }
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    verifySession,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
