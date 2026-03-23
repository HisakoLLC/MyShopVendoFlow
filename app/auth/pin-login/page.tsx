"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { AuthImageRotation } from "@/components/auth/AuthImageRotation"

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]

function PinLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") ?? "/pos"
  const timeout = searchParams.get("timeout")
  const [pin, setPin] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [timeoutMessage, setTimeoutMessage] = React.useState<string | null>(null)
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    if (timeout === "idle") {
      setTimeoutMessage("Your session expired due to inactivity. Please log in again.")
    } else if (timeout === "expired") {
      setTimeoutMessage("Your session has expired. Please log in again.")
    } else if (!timeout) {
      // Proactively redirect if already logged in (no timeout context)
      supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
        if (data.session) {
          router.push(redirectTo)
        }
      })
    }
  }, [timeout, supabase, router, redirectTo])

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

    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Invalid PIN. Try again.")
        setPin("")
        setIsLoading(false)
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })

      if (sessionError) throw sessionError

      toast.success("Staff authenticated")
      router.push(redirectTo)
    } catch {
      toast.error("Authentication failed. Please try again.")
      setIsLoading(false)
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
              Staff PIN Login
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Enter your 6-digit access code.
            </p>
          </div>

          {timeoutMessage && (
            <div className="mb-6 rounded-sm border-l-2 border-white bg-zinc-900 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                {timeoutMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-center lg:justify-start">
              <div
                className="flex h-16 w-full max-w-[280px] items-center justify-center gap-3 rounded-sm border border-zinc-800 bg-zinc-900 px-6 shadow-inner"
                aria-label="PIN digits"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{ 
                      scale: i < pin.length ? [1, 1.2, 1] : 1,
                      backgroundColor: i < pin.length ? "#ffffff" : "#27272a" 
                    }}
                    className="h-3 w-3 rounded-full"
                    style={{ opacity: i < pin.length ? 1 : 0.3 }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {DIGITS.map((d, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleDigit(d)}
                  className={
                    d === ""
                      ? "pointer-events-none"
                      : "flex h-16 items-center justify-center rounded-sm border border-zinc-800 bg-zinc-900 text-xl font-medium text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 disabled:opacity-50"
                  }
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading || pin.length === 0}
                className="flex-1 rounded-sm border border-zinc-800 bg-transparent py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all disabled:opacity-20"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isLoading || pin.length !== 6}
                className="flex-1 items-center justify-center bg-white text-black hover:bg-zinc-200 rounded-sm py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-20"
              >
                {isLoading ? "Verifying..." : "Access"}
              </button>
            </div>
          </form>

          <div className="mt-12 pt-6 border-t border-zinc-800 text-center lg:text-left">
            <p className="text-sm text-zinc-500">
              Not staff?{" "}
              <Link
                href="/login"
                className="font-bold text-white hover:underline underline-offset-4"
              >
                Owner Login
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

function PinLoginFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white font-editorial text-2xl animate-pulse">
      Loading...
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
