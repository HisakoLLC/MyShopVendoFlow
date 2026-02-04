"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Settings, LayoutDashboard } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getFriendlyErrorMessage } from "@/lib/friendly-errors"

type SettingsErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SettingsError({ error, reset }: SettingsErrorProps) {
  const friendlyMessage = getFriendlyErrorMessage(error, {
    defaultMessage:
      "We couldn't load this page. This might be because you're not signed in, your session expired, or something went wrong on our end.",
  })

  useEffect(() => {
    console.error("Settings error:", error)
  }, [error])

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1 text-sm opacity-90">
              {friendlyMessage}
            </p>
            <p className="mt-3 text-sm opacity-90">
              <strong>What you can do:</strong>
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm opacity-90">
              <li>Click &quot;Try again&quot; to reload the page</li>
              <li>Sign out and sign back in if the problem continues</li>
              <li>Go to Dashboard and come back to Settings later</li>
            </ul>
            {error.digest && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                Reference for support: <strong>{error.digest}</strong>
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={reset} variant="outline" size="sm" className="bg-white dark:bg-amber-950/50">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white dark:bg-amber-950/50">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700">
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
