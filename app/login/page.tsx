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

import { AuthImageRotation } from "@/components/auth/AuthImageRotation"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deletedParam = searchParams.get("deleted") === "1"
  const timeout = searchParams.get("timeout")
  const [supabaseError, setSupabaseError] = React.useState<string | null>(null)
  const [timeoutMessage, setTimeoutMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (timeout === "idle") {
      setTimeoutMessage("Your session expired due to inactivity. Please log in again.")
    } else if (timeout === "expired") {
      setTimeoutMessage("Your session has expired. Please log in again.")
    }
  }, [timeout])
  
  const supabase = React.useMemo(() => {
    try {
      return createClient()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize Supabase client"
      setSupabaseError(errorMessage)
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
      toast.error(supabaseError || "Supabase client not initialized.")
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
        const { data: accountMember, error: memberError } = await supabase
          .from("account_members")
          .select("account_id")
          .eq("user_id", data.user.id)
          .single()

        if (memberError || !accountMember) {
          const deleted = await isAccountDeletedForCurrentUser()
          if (deleted) {
            await supabase.auth.signOut()
            window.location.href = "/login?deleted=1"
            return
          }
          router.push("/onboarding")
        } else {
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
      const data = (await res.json().catch(() => ({}))) as any
      if (!res.ok) {
        toast.error(data.error || "Invalid PIN. Try again.")
        return
      }
      if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        if (sessionError) {
          toast.error("Failed to establish session. Try again.")
          return
        }
        router.push("/dashboard")
        router.refresh()
        return
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-black overflow-hidden font-sans">
      <Toaster richColors position="top-right" />
      
      {/* Form Side */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="font-editorial text-4xl font-bold tracking-tight text-white mb-2 underline decoration-zinc-800 decoration-4 underline-offset-8">
              VendoFlow
            </h1>
            <h2 className="text-xl font-medium text-zinc-100 mt-6 capitalize">
              {savedStore
                ? `Sign in to ${savedStore.store_name}`
                : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              {savedStore && !showEmailPassword && (
                "Staff: enter your 6-digit PIN. Owner? Use email and password."
              )}
              {(!savedStore || showEmailPassword) && (
                "Enter your details to manage your boutique."
              )}
            </p>
          </div>

          <div className="space-y-6">
            {timeoutMessage && (
              <div className="rounded-sm border-l-2 border-amber-500 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-amber-200">
                  {timeoutMessage}
                </p>
              </div>
            )}

            {deletedParam && (
              <div className="rounded-sm border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Account scheduled for deletion</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Your account has been marked for deletion. Data will be removed after 90 days.
                </p>
              </div>
            )}

            {savedStore && !showEmailPassword && (
              <div className="space-y-4">
                <form onSubmit={handlePinLogin} className="space-y-4">
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    disabled={pinLoading}
                    className="font-mono text-center text-3xl tracking-[0.6em] h-16 bg-zinc-900 border-zinc-700 text-white rounded-sm focus-visible:ring-zinc-600"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                  <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-zinc-200 transition-all rounded-sm font-semibold uppercase tracking-wider text-xs" disabled={pin.replace(/\D/g, "").length < 6 || pinLoading}>
                    {pinLoading ? "Authenticating..." : "Sign in with PIN"}
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(true)}
                  className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-[0.15em] font-semibold"
                >
                  Owner login instead
                </button>
              </div>
            )}

            {(!savedStore || showEmailPassword) && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@boutique.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-zinc-900 border-zinc-800 text-white h-11 focus-visible:ring-zinc-600 rounded-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isLoading || isResetting}
                      className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-500 hover:text-zinc-300"
                    >
                      {isResetting ? "Sending..." : "Forgot?"}
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-zinc-900 border-zinc-800 text-white h-11 focus-visible:ring-zinc-600 rounded-sm"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isLoading}
                    className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-black"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-xs font-medium text-zinc-400 cursor-pointer select-none"
                  >
                    Keep me signed in
                  </Label>
                </div>

                <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-zinc-200 transition-all rounded-sm font-semibold uppercase tracking-wider text-xs" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Continue"}
                </Button>
              </form>
            )}

            <div className="pt-6 border-t border-zinc-800 text-center lg:text-left">
              <p className="text-sm text-zinc-500">
                New to the platform?{" "}
                <Link
                  href="/signup"
                  className="font-bold text-white hover:underline underline-offset-4"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Side */}
      <div className="relative hidden w-0 flex-1 lg:block p-6">
        <AuthImageRotation />
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="font-editorial text-4xl font-bold tracking-tight text-white mb-2">
          VendoFlow
        </h1>
        <p className="text-sm text-zinc-500 animate-pulse">Initializing editor...</p>
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
