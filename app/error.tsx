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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <Card className="w-full max-w-md border-border bg-card shadow-sm text-card-foreground">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-500/10 p-2 border border-red-500/20">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-sans tracking-tight">Something went wrong</CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">
                {isGenericProductionError(error.message || "")
                  ? "We couldn't load this page. You can try again or go back to the dashboard."
                  : friendlyMessage}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest && (
            <p className="text-center text-xs text-muted-foreground">
              If you contact support, you can give them this reference: <strong className="font-mono text-foreground">{error.digest}</strong>
            </p>
          )}

          {showTechnicalDetails && (
            <details className="rounded-lg border border-border bg-muted p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                Technical details (for developers)
              </summary>
              <p className="mt-2 text-xs font-mono text-foreground break-words">
                {error.message || "Unknown error"}
              </p>
              {error.stack && (
                <pre className="mt-2 max-h-40 overflow-auto text-xs font-mono text-muted-foreground">
                  {error.stack}
                </pre>
              )}
            </details>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1 border-border hover:bg-accent">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button onClick={() => router.push("/dashboard")} className="flex-1 bg-[#E8400C] hover:bg-[#c73508] text-white border-none shadow-sm">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            If this keeps happening, try signing out and back in, or contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
