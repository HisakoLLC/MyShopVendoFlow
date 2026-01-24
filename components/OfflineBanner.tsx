"use client"

import * as React from "react"
import { WifiOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function OfflineBanner() {
  const [isOffline, setIsOffline] = React.useState(false)

  React.useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-950/30">
      <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="text-yellow-900 dark:text-yellow-100">
        You're offline. Some features may not work.
      </AlertDescription>
    </Alert>
  )
}
