"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getFriendlyErrorMessage, isGenericProductionError } from "@/lib/friendly-errors"

type DashboardErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const friendlyMessage = getFriendlyErrorMessage(error, {
    defaultMessage: "We couldn't load the dashboard. Try again or sign in again.",
  })

  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  const showTechnical = !isGenericProductionError(error.message || "") && process.env.NODE_ENV !== "production"

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background text-foreground">
      <Card className="w-full max-w-md border-border bg-card shadow-sm text-card-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-sans tracking-tight">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Something went wrong
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {friendlyMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">What you can do:</strong> Click &quot;Try again&quot; to reload, or go to the home page. If it keeps happening, sign out and back in.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Reference for support: <strong className="font-mono text-foreground">{error.digest}</strong>
            </p>
          )}
          {showTechnical && error.message && (
            <p className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded border border-border break-all">
              {error.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} variant="outline" className="border-border hover:bg-accent">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button asChild className="bg-[#E8400C] hover:bg-[#c73508] text-white border-none shadow-sm">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
