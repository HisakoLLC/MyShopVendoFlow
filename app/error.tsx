"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ErrorBoundaryProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const router = useRouter()

  useEffect(() => {
    // Log error to console (in production, send to error tracking service)
    console.error("Error boundary caught:", error)

    // In production, you would send to error tracking service like Sentry:
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error)
    // }
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
                An unexpected error occurred. We're sorry for the inconvenience.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show error details in both dev and production for debugging */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-words">
              {error.message || "Unknown error"}
            </p>
            {error.digest && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                Error ID: {error.digest}
              </p>
            )}
            {error.stack && process.env.NODE_ENV === "development" && (
              <details className="mt-2">
                <summary className="text-xs text-zinc-500 dark:text-zinc-500 cursor-pointer">
                  Stack trace
                </summary>
                <pre className="mt-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={() => router.push("/dashboard")} className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            If this problem persists, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
