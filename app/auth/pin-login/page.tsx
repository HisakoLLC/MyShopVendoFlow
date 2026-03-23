"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]

function PinLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") ?? "/pos"
  const timeout = searchParams.get("timeout")
  const [pin, setPin] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [timeoutMessage, setTimeoutMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (timeout === "idle") {
      setTimeoutMessage("Your session expired due to inactivity. Please log in again.")
    } else if (timeout === "expired") {
      setTimeoutMessage("Your session has expired. Please log in again.")
    }
  }, [timeout])

  const handleDigit = (d: string) => {
    if (d === "⌫") {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (d === "" || pin.length >= 6) return
    setPin((p) => p + d)
  }

  const handleClear = () => setPin("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = pin.replace(/\D/g, "").slice(0, 6)
    if (trimmed.length !== 6) {
      toast.error("Enter a 6-digit PIN")
      return
    }

    setIsLoading(true)
    setError(null)
    setTimeoutMessage(null)

    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: trimmed }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        access_token?: string
        refresh_token?: string
        locked_until?: string
      }

      if (!res.ok) {
        if (res.status === 429 && data.locked_until) {
          toast.error(data.error || "Too many failed attempts. Please wait before trying again.")
        } else {
          toast.error(data.error ?? "Invalid PIN. Try again.")
        }
        setPin("")
        setIsLoading(false)
        return
      }

      if (!data.access_token || !data.refresh_token) {
        toast.error("Login failed. Try again.")
        setIsLoading(false)
        return
      }

      // Set session with returned tokens
      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })

      if (sessionError) {
        toast.error("Failed to establish session")
        setIsLoading(false)
        return
      }

      // Redirect to POS
      router.push(redirectTo)
    } catch {
      toast.error("Network error. Please try again.")
      setIsLoading(false)
    }
  }

  const [error, setError] = React.useState<string | null>(null)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-light px-4 dark:bg-background-card-dark-dark">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-background-card-light p-8 shadow-xl dark:border-border-dark dark:bg-background-card-dark-card-dark">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Staff PIN Login</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your 6-digit PIN to sign in
          </p>
        </div>

        {timeoutMessage && (
          <div className="mb-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {timeoutMessage}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <div
              className="flex h-14 w-full max-w-[240px] items-center justify-center gap-1 rounded-xl border-2 border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-background-card-dark"
              aria-label="PIN digits"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500"
                  style={{
                    opacity: i < pin.length ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {DIGITS.map((d) => (
              <button
                key={d || `empty-${DIGITS.indexOf(d)}`}
                type="button"
                disabled={isLoading}
                onClick={() => handleDigit(d)}
                className={
                  d === ""
                    ? "pointer-events-none"
                    : "flex h-14 items-center justify-center rounded-xl border border-zinc-200 bg-background text-xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-background-card-dark dark:text-zinc-100 dark:hover:bg-zinc-700"
                }
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || pin.length === 0}
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-100 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-background-card-dark dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isLoading || pin.length !== 6}
              className="flex-1 items-center justify-center bg-zinc-900 text-white hover:bg-zinc-800 rounded-sm py-3 text-sm font-semibold tracking-[0.12em] uppercase transition-colors disabled:opacity-50"
            >
              {isLoading ? "Signing in…" : "Login"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/login" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            Owner login (email & password)
          </Link>
        </p>
      </div>
    </div>
  )
}

function PinLoginFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-light px-4 dark:bg-background-card-dark-dark">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-background-card-light p-8 shadow-xl dark:border-border-dark dark:bg-background-card-dark-card-dark">
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
      </div>
    </div>
  )
}

export default function PinLoginPage() {
  return (
    <Suspense fallback={<PinLoginFallback />}>
      <PinLoginContent />
    </Suspense>
  )
}
