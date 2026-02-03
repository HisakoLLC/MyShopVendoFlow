"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type PurchasingErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PurchasingError({ error, reset }: PurchasingErrorProps) {
  useEffect(() => {
    console.error("Purchasing error:", error)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1 text-sm opacity-90">
              Purchasing could not load. This is often a database permission issue.
            </p>
            {error.message && (
              <p className="mt-3 rounded bg-red-100/50 px-2 py-1.5 font-mono text-xs break-all dark:bg-red-900/30">
                {error.message}
              </p>
            )}
            <div className="mt-4 rounded-lg border border-red-200 bg-background p-4 text-sm text-zinc-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-zinc-300">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Run these in Supabase SQL Editor (in order):
              </p>
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>
                  <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                    sql/FIX_SUPPLIERS_ACCESS.sql
                  </code>
                </li>
                <li>
                  <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                    sql/FIX_PURCHASING_PO_ACCESS.sql
                  </code>
                </li>
              </ol>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Then click Try again or go back to Purchasing.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={reset} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
              <Button asChild size="sm">
                <Link href="/purchasing/restock">Back to Purchasing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
