"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getFriendlyErrorMessage, isGenericProductionError } from "@/lib/friendly-errors"

type ErrorBoundaryProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const router = useRouter()
  const isProduction = process.env.NODE_ENV === "production"
  const showTechnicalDetails = !isProduction
  const friendlyMessage = getFriendlyErrorMessage(error)

  useEffect(() => {
    console.error("Error boundary caught:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light px-4 py-12 dark:bg-background-dark">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription className="mt-1">
                {isGenericProductionError(error.message || "")
                  ? "We couldn't load this page. You can try again or go back to the dashboard."
                  : friendlyMessage}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest && (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              If you contact support, you can give them this reference: <strong>{error.digest}</strong>
            </p>
          )}

          {showTechnicalDetails && (
            <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <summary className="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Technical details (for developers)
              </summary>
              <p className="mt-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 break-words">
                {error.message || "Unknown error"}
              </p>
              {error.stack && (
                <pre className="mt-2 max-h-40 overflow-auto text-xs font-mono text-zinc-500 dark:text-zinc-500">
                  {error.stack}
                </pre>
              )}
            </details>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button onClick={() => router.push("/dashboard")} className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            If this keeps happening, try signing out and back in, or contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
