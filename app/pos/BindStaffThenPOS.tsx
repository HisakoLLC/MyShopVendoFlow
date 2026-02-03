"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const POS_STAFF_SHARED_EMAIL = "pos-staff@vendoflow.internal"

export function BindStaffThenPOS({
  staffId,
  accountId,
}: {
  staffId: string
  accountId: string
}) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function bind() {
      try {
        const res = await fetch("/api/auth/bind-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staff_id: staffId, account_id: accountId }),
        })
        if (cancelled) return
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError((data as { error?: string }).error ?? "Failed to bind session")
          return
        }
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (user?.email !== POS_STAFF_SHARED_EMAIL) {
          router.replace("/pos")
          return
        }
        await supabase.auth.refreshSession()
        if (cancelled) return
        // Full page load so server/middleware see the new session cookie with role in JWT
        if (typeof window !== "undefined") {
          window.location.href = "/pos"
          return
        }
        router.replace("/pos")
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong")
      }
    }
    bind()
    return () => {
      cancelled = true
    }
  }, [staffId, accountId, router])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4 dark:bg-background">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-background p-8 shadow-lg dark:border-zinc-800 dark:bg-background">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Session error</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/auth/pin-login?redirect=/pos")}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 dark:bg-primary dark:text-primary-foreground dark:hover:opacity-90"
          >
            Back to PIN login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Setting up POS...</p>
      </div>
    </div>
  )
}
