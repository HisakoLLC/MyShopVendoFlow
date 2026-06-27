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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-card-foreground">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold font-sans tracking-tight text-foreground">Staff PIN Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your 6-digit PIN to sign in
          </p>
        </div>

        {timeoutMessage && (
          <div className="mb-6 rounded-lg border-l-4 border-amber-500 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-200">
              {timeoutMessage}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <div
              className="flex h-14 w-full max-w-[240px] items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 px-4"
              aria-label="PIN digits"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${i < pin.length ? "bg-[#E8400C] scale-110" : "bg-muted-foreground/30"}`}
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
                    : "flex h-14 items-center justify-center rounded-xl border border-border bg-background text-xl font-semibold font-mono text-foreground shadow-sm transition-all hover:bg-accent hover:border-muted-foreground/40 active:scale-95 disabled:opacity-50"
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
              className="flex-1 rounded-md border border-border bg-transparent py-3 text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isLoading || pin.length !== 6}
              className="flex-1 items-center justify-center bg-[#E8400C] text-white hover:bg-[#c73508] rounded-md py-3 text-xs font-semibold tracking-[0.12em] uppercase transition-colors disabled:opacity-50 border-none shadow-sm"
            >
              {isLoading ? "Signing in…" : "Login"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline hover:text-foreground transition-colors">
            Owner login (email & password)
          </Link>
        </p>
      </div>
    </div>
  )
}

function PinLoginFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-[#E8400C]" />
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
