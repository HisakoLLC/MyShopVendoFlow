"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import { Suspense } from "react"

import { createClient } from "@/lib/supabase/client"
import { isAccountDeletedForCurrentUser } from "@/app/onboarding/actions"

export const dynamic = "force-dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

const STORE_ID_KEY = "vendoflow_last_store_id"
const STORE_NAME_KEY = "vendoflow_last_store_name"
const ACCOUNT_ID_KEY = "vendoflow_last_account_id"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deletedParam = searchParams.get("deleted") === "1"
  const [supabaseError, setSupabaseError] = React.useState<string | null>(null)
  const supabase = React.useMemo(() => {
    try {
      return createClient()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize Supabase client"
      setSupabaseError(errorMessage)
      // Return a mock client that will fail gracefully
      return null as any
    }
  }, [])
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [rememberMe, setRememberMe] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isResetting, setIsResetting] = React.useState(false)

  const [savedStore, setSavedStore] = React.useState<{
    store_id: string
    store_name: string
    account_id?: string
  } | null>(null)
  const [showEmailPassword, setShowEmailPassword] = React.useState(false)
  const [pin, setPin] = React.useState("")
  const [pinLoading, setPinLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function validateAndSetSavedStore() {
      try {
        const storeId = localStorage.getItem(STORE_ID_KEY)
        const storeName = localStorage.getItem(STORE_NAME_KEY)
        const accountId = localStorage.getItem(ACCOUNT_ID_KEY)
        if (!storeId || !storeName) return

        const res = await fetch(
          `/api/validate-store?store_id=${encodeURIComponent(storeId)}`
        )
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean
          store_name?: string
          account_id?: string
        }
        if (cancelled) return

        if (data.valid === true) {
          setSavedStore({
            store_id: storeId,
            store_name: data.store_name ?? storeName,
            account_id: data.account_id || accountId || undefined,
          })
        } else {
          localStorage.removeItem(STORE_ID_KEY)
          localStorage.removeItem(STORE_NAME_KEY)
          localStorage.removeItem(ACCOUNT_ID_KEY)
          setSavedStore(null)
        }
      } catch {
        if (!cancelled) setSavedStore(null)
      }
    }
    validateAndSetSavedStore()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (supabaseError || !supabase) {
      toast.error(supabaseError || "Supabase client not initialized. Please check your environment variables.")
      return
    }
    
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Invalid email or password")
        return
      }

      if (data.user) {
        // Check if user has completed onboarding (has account_members record)
        const { data: accountMember, error: memberError } = await supabase
          .from("account_members")
          .select("account_id")
          .eq("user_id", data.user.id)
          .single()

        if (memberError || !accountMember) {
          // No account linked: check if account was deleted (scheduled for deletion)
          const deleted = await isAccountDeletedForCurrentUser()
          if (deleted) {
            await supabase.auth.signOut()
            window.location.href = "/login?deleted=1"
            return
          }
          router.push("/onboarding")
        } else {
          // Account exists, redirect to dashboard
          router.push("/dashboard")
        }
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first")
      return
    }

    setIsResetting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Password reset email sent! Check your inbox.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email")
    } finally {
      setIsResetting(false)
    }
  }

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const pinTrimmed = pin.replace(/\D/g, "").slice(0, 8)
    if (!savedStore || pinTrimmed.length < 6 || supabaseError || !supabase) return

    setPinLoading(true)
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: savedStore.store_id,
          account_id: savedStore.account_id ?? undefined,
          pin: pinTrimmed,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        email?: string
        sign_in_link?: string
      }
      if (!res.ok) {
        toast.error(data.error || "Invalid PIN. Try again.")
        return
      }
      if (data.sign_in_link) {
        window.location.href = data.sign_in_link
        return
      }
      if (!data.email) {
        toast.error("Invalid PIN. Try again.")
        return
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: pinTrimmed,
      })
      if (error) {
        toast.error("Sign-in failed. Use the 6-digit PIN you were given, or ask an owner to reset your PIN in Staff settings.")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light px-4 dark:bg-background-dark">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-200 bg-background-card-light p-8 shadow-lg dark:border-border-dark dark:bg-background-card-dark">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            VendoFlow
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {savedStore
              ? `Sign in to ${savedStore.store_name}`
              : "Sign in to your account"}
          </p>
          {savedStore && !showEmailPassword && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Staff: enter your 6-digit PIN. Owner? Use email and password below.
            </p>
          )}
          {(!savedStore || showEmailPassword) && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Use your email and password to sign in.
            </p>
          )}
        </div>

        {deletedParam && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Account scheduled for deletion</p>
            <p className="mt-1 text-xs text-blue-800 dark:text-blue-200">
              Your account has been marked for deletion. All data will be permanently removed after 90 days.
              You can request a copy of your data before then by contacting support.
            </p>
          </div>
        )}

        {supabaseError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">Configuration Error</p>
            <p className="mt-1 text-xs text-red-800 dark:text-red-200">{supabaseError}</p>
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">
              In Vercel: Settings → Environment Variables, add <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> (use the same values as your Supabase project URL and anon key). Redeploy after saving.
            </p>
          </div>
        )}

        {savedStore && !showEmailPassword && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-background-card-dark/50">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Staff — enter your 6-digit PIN
            </p>
            <form onSubmit={handlePinLogin} className="mt-4 space-y-3">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                disabled={pinLoading}
                className="font-mono text-center text-2xl tracking-[0.5em]"
                autoComplete="one-time-code"
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={pin.replace(/\D/g, "").length < 6 || pinLoading}>
                {pinLoading ? "Signing in..." : "Sign in with PIN"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setShowEmailPassword(true)}
              className="mt-3 block w-full text-center text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Owner? Sign in with email and password
            </button>
          </div>
        )}

        {(!savedStore || showEmailPassword) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isLoading || isResetting}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {isResetting ? "Sending..." : "Forgot password?"}
            </button>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </form>
        )}

        {showEmailPassword && savedStore && (
          <button
            type="button"
            onClick={() => setShowEmailPassword(false)}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to PIN login for {savedStore.store_name}
          </button>
        )}

        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light px-4 dark:bg-background-dark">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-background-card-light p-8 shadow-lg dark:border-border-dark dark:bg-background-card-dark">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            VendoFlow
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}
