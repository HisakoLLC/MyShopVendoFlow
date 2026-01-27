"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DashboardErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Something went wrong
          </CardTitle>
          <CardDescription>
            The dashboard could not load. This often happens when the database still needs
            permission setup for your account and dashboard tables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
            <p className="font-medium mb-2">Fix it in Supabase (run in SQL Editor in this order):</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
              <li>
                <code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">
                  sql/AUTO_CREATE_ACCOUNT_ON_SIGNUP.sql
                </code>{" "}
                — creates account for every user
              </li>
              <li>
                <code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">
                  sql/FIX_ALL_RLS_ISSUES.sql
                </code>{" "}
                — accounts, stores, categories
              </li>
              <li>
                <code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">
                  sql/FIX_DASHBOARD_ACCESS.sql
                </code>{" "}
                — sales, dashboard tables
              </li>
            </ol>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Then click &quot;Try again&quot; below.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button asChild className="flex-1">
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
