"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import { Suspense } from "react"

import { createClient } from "@/lib/supabase/client"
import { isAccountDeletedForCurrentUser } from "@/app/onboarding/actions"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthImageRotation } from "@/components/auth/AuthImageRotation"

const STORE_ID_KEY = "vendoflow_last_store_id"
const STORE_NAME_KEY = "vendoflow_last_store_name"
const ACCOUNT_ID_KEY = "vendoflow_last_account_id"

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

        const res = await fetch(`/api/validate-store?store_id=${encodeURIComponent(storeId)}`)
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
    return () => { cancelled = true }
  }, [])

  const handleInitialEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setShowEmailPassword(true)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setIsLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        toast.error(authError.message)
        setIsLoading(false)
        return
      }

      if (data.user) {
        const isDeleted = await isAccountDeletedForCurrentUser()
        if (isDeleted) {
          await supabase.auth.signOut()
          router.push("/login?deleted=1")
          setIsLoading(false)
          return
        }
      }

      toast.success("Welcome back!")
      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred")
      setIsLoading(false)
    }
  }

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin || !savedStore?.store_id) return
    setPinLoading(true)

    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          store_id: savedStore.store_id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed")

      const { data: signInData, error: signInError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (signInError) throw signInError

      toast.success(`Signed in to ${savedStore.store_name}`)
      router.push("/pos")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
      setPin(0 as any)
    } finally {
      setPinLoading(false)
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
      if (error) throw error
      toast.success("Password reset email sent!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsResetting(false)
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
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Enter your details to manage your boutique.
            </p>
          </div>

          {!showEmailPassword && savedStore ? (
            <div className="space-y-6">
              <div className="p-4 rounded-sm border border-zinc-800 bg-zinc-900 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-black font-bold text-lg">
                  {savedStore.store_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Active Store</p>
                  <p className="text-white font-medium">{savedStore.store_name}</p>
                </div>
              </div>

              <form onSubmit={handlePinLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick Pin Access</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800 text-white h-11 text-center text-xl tracking-[1em] focus-visible:ring-zinc-600 rounded-sm"
                  />
                </div>
                <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-zinc-200 transition-all rounded-sm font-semibold uppercase tracking-wider text-xs" disabled={pinLoading}>
                  {pinLoading ? "Authenticating..." : "Open POS"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(true)}
                  className="w-full text-xs text-zinc-500 hover:text-white transition-colors py-2 uppercase tracking-widest"
                >
                  Switch User or Login via Email
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={showEmailPassword ? handleLogin : handleInitialEmailCheck} className="space-y-5">
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

              {showEmailPassword && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between px-1">
                    <Label htmlFor="password" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[0.6rem] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                    >
                      Forgot?
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
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(!!checked)}
                      className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-black rounded-none"
                    />
                    <label htmlFor="rememberMe" className="text-[0.7rem] leading-none text-zinc-500 font-medium">
                      Keep me signed in
                    </label>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-zinc-200 transition-all rounded-sm font-semibold uppercase tracking-wider text-xs mt-4" disabled={isLoading}>
                {isLoading ? "Authenticating..." : showEmailPassword ? "Continue" : "Continue"}
              </Button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center lg:text-left">
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

      {/* Image Side */}
      <div className="relative hidden w-0 flex-1 lg:block p-6">
        <AuthImageRotation />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white font-editorial text-2xl animate-pulse">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
