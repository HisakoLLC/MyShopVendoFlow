"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Suspense } from "react"

/**
 * Auth callback for magic link (staff PIN login).
 * Supabase redirects here with #access_token=... (hash not sent to server).
 * We exchange the hash for a session client-side, then redirect to /pos so
 * the next request has the session cookie and middleware allows access.
 */
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function run() {
      const hash = typeof window !== "undefined" ? window.location.hash : ""
      if (!hash) {
        if (!cancelled) setError("No auth token in URL. Try logging in again.")
        return
      }

      const params = new URLSearchParams(hash.slice(1))
      const access_token = params.get("access_token")
      const refresh_token = params.get("refresh_token")
      if (!access_token || !refresh_token) {
        if (!cancelled) setError("Invalid auth token. Try logging in again.")
        return
      }

      try {
        const supabase = createClient()
        const { error: setErrorResult } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })
        if (cancelled) return
        if (setErrorResult) {
          setError(setErrorResult.message)
          return
        }
        // Redirect to /pos; middleware will see session cookie and allow
        const redirectTo = searchParams.get("redirect") || "/pos"
        router.replace(redirectTo)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong")
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [searchParams, router])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background-light px-4 dark:bg-background-dark">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-background-card-light p-8 shadow-lg dark:border-border-dark dark:bg-background-card-dark">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Sign-in error</h2>
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Completing sign-in...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-background-light dark:bg-background-dark">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
