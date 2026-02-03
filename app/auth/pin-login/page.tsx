"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

const STORE_ID_KEY = "vendoflow_last_store_id"
const STORE_NAME_KEY = "vendoflow_last_store_name"
const ACCOUNT_ID_KEY = "vendoflow_last_account_id"

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]

function PinLoginContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") ?? "/pos"
  const [pin, setPin] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [storeId, setStoreId] = React.useState<string | null>(null)
  const [storeName, setStoreName] = React.useState<string>("")
  const [accountId, setAccountId] = React.useState<string | undefined>(undefined)

  // Single store per account: we need either account_id or store_id (from URL or localStorage)
  React.useEffect(() => {
    const accountFromUrl = searchParams.get("account_id")
    const storeFromUrl = searchParams.get("store_id")
    const nameFromUrl = searchParams.get("store_name")
    if (accountFromUrl) {
      setAccountId(accountFromUrl)
      setStoreId(null)
      setStoreName("")
      return
    }
    if (storeFromUrl) {
      setStoreId(storeFromUrl)
      setStoreName(nameFromUrl ?? "")
      setAccountId(undefined)
      return
    }
    try {
      const savedAccountId = typeof window !== "undefined" ? localStorage.getItem(ACCOUNT_ID_KEY) : null
      const savedStoreId = typeof window !== "undefined" ? localStorage.getItem(STORE_ID_KEY) : null
      const savedName = typeof window !== "undefined" ? localStorage.getItem(STORE_NAME_KEY) : null
      if (savedAccountId) {
        setAccountId(savedAccountId)
        setStoreId(savedStoreId)
        setStoreName(savedName ?? "")
      } else if (savedStoreId) {
        setStoreId(savedStoreId)
        setStoreName(savedName ?? "")
        setAccountId(undefined)
      }
    } catch {
      // ignore
    }
  }, [searchParams])

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
    // Single store: account_id or store_id is enough
    if (!accountId && !storeId) {
      toast.error("Open POS from a device where someone has already signed in, or use the link your manager gave you.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(storeId ? { store_id: storeId } : {}),
          ...(accountId ? { account_id: accountId } : {}),
          pin: trimmed,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        sign_in_link?: string
      }
      if (!res.ok) {
        toast.error(data.error ?? "Invalid PIN. Try again.")
        setIsLoading(false)
        return
      }
      if (data.sign_in_link) {
        window.location.href = data.sign_in_link
        return
      }
      toast.error("Login failed. Try again.")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Staff PIN</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {storeName ? `Sign in to ${storeName}` : "Enter your 6-digit PIN"}
          </p>
        </div>

        {!accountId && !storeId ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              To sign in with PIN, open the POS from a device where someone has already signed in, or use the link your manager gave you.
            </p>
            <Link href="/login" className="mt-3 inline-block text-sm font-medium text-amber-700 dark:text-amber-300 underline">
              Owner login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <div
                className="flex h-14 w-full max-w-[240px] items-center justify-center gap-1 rounded-xl border-2 border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800"
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
                      : "flex h-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-100 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isLoading || pin.length !== 6}
                className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isLoading ? "Signing in…" : "Login"}
              </button>
            </div>
          </form>
        )}

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
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
