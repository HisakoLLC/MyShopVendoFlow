"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function StaffSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Staff settings error:", error.message, error.digest)
  }, [error])

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/30">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          The staff page had a temporary issue. If you just created a staff member, they were saved
          and the PIN was generated — you may have seen it briefly. Refresh the page to see the
          updated list.
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => reset()}
        >
          Try again
        </Button>
      </div>
    </div>
  )
}
