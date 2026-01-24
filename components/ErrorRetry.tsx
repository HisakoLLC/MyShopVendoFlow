"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type ErrorRetryProps = {
  onRetry: () => void
  message?: string
}

export function ErrorRetry({ onRetry, message = "Failed to load data. Check your connection." }: ErrorRetryProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 dark:border-red-900/40 dark:bg-red-950/30">
      <p className="text-sm text-red-900 dark:text-red-100">{message}</p>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  )
}
