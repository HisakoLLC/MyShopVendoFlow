"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getFriendlyErrorMessage, isGenericProductionError } from "@/lib/friendly-errors"

type PurchasingErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PurchasingError({ error, reset }: PurchasingErrorProps) {
  const friendlyMessage = getFriendlyErrorMessage(error, {
    defaultMessage: "We couldn't load Purchasing. Try again or go back to the dashboard.",
  })

  useEffect(() => {
    console.error("Purchasing error:", error)
  }, [error])

  const showTechnical = !isGenericProductionError(error.message || "") && process.env.NODE_ENV !== "production"

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1 text-sm opacity-90">{friendlyMessage}</p>
            <p className="mt-3 text-sm opacity-90">
              Click &quot;Try again&quot; to reload, or go back to Purchasing. If it keeps happening, sign out and back in.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs opacity-80">Reference for support: <strong>{error.digest}</strong></p>
            )}
            {showTechnical && error.message && (
              <p className="mt-3 rounded bg-amber-100/50 px-2 py-1.5 font-mono text-xs break-all dark:bg-amber-900/30">
                {error.message}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={reset} variant="outline" size="sm" className="bg-white dark:bg-amber-950/50">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
              <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700">
                <Link href="/purchasing/restock">Back to Purchasing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
