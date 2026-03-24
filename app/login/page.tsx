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
    let cancelled = false;

    async function initialize() {
      // 1. Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        router.push("/dashboard");
        return;
      }

      // 2. Validate saved store if no session
      try {
        const storeId = localStorage.getItem(STORE_ID_KEY);
        const storeName = localStorage.getItem(STORE_NAME_KEY);
        const accountId = localStorage.getItem(ACCOUNT_ID_KEY);
        if (!storeId || !storeName) return;

        const res = await fetch(`/api/validate-store?store_id=${encodeURIComponent(storeId)}`);
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          store_name?: string;
          account_id?: string;
        };
        if (cancelled) return;

        if (data.valid === true) {
          setSavedStore({
            store_id: storeId,
            store_name: data.store_name ?? storeName,
            account_id: data.account_id || accountId || undefined,
          });
        } else {
          localStorage.removeItem(STORE_ID_KEY);
          localStorage.removeItem(STORE_NAME_KEY);
          localStorage.removeItem(ACCOUNT_ID_KEY);
          setSavedStore(null);
        }
      } catch {
        if (!cancelled) setSavedStore(null);
      }
    }

    initialize();
    return () => { cancelled = true; };
  }, [supabase, router]);

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
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Toaster richColors position="top-right" />
      
      {/* Left form panel - scrollable */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center px-8 py-12 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-editorial text-2xl font-bold text-zinc-50 mb-8 text-center">
              VendoFlow
            </h1>
            <h2 className="font-editorial text-3xl font-bold text-zinc-50 mb-2">
              Welcome Back
            </h2>
            <p className="text-sm text-zinc-500 mb-8">
              Enter your details to manage your boutique.
            </p>
          </div>

          {!showEmailPassword && savedStore ? (
            <div className="space-y-6">
              <div className="p-4 rounded-md border border-zinc-800 bg-zinc-900 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-black font-bold text-lg">
                  {savedStore.store_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Active Store</p>
                  <p className="text-white font-medium">{savedStore.store_name}</p>
                </div>
              </div>

              <form onSubmit={handlePinLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Quick Pin Access</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-11 px-4 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 text-center text-xl tracking-[1em]"
                  />
                </div>
                <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-11 w-full text-xs font-semibold tracking-[0.15em] uppercase" disabled={pinLoading}>
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
                <Label htmlFor="email" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@boutique.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-11 px-4 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                />
              </div>

              {showEmailPassword && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase text-zinc-500 hover:text-zinc-100"
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
                    className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-11 px-4 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
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

              <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-11 w-full text-xs font-semibold tracking-[0.15em] uppercase mt-4" disabled={isLoading}>
                {isLoading ? "Authenticating..." : "Continue"}
              </Button>
            </form>
          )}

          <div className="w-full h-px bg-zinc-800 my-6" />

          <div className="text-center lg:text-left">
            <p className="text-sm text-zinc-500">
              New to the platform?{" "}
              <Link
                href="/signup"
                className="text-sm font-semibold text-zinc-100 hover:text-white"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right image panel - fixed */}
      <div className="hidden lg:block lg:w-1/2 h-full p-3 overflow-hidden">
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
