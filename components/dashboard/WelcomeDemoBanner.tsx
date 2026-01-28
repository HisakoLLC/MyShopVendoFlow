"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * Shown on the dashboard when the account has no sales yet.
 * Offers a clear "Load demo data" action so new users can explore the app.
 */
export function WelcomeDemoBanner({ show }: { show: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!show) return null

  const handleLoadDemo = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/seed-demo", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Failed to load demo data")
        return
      }
      toast.success("Demo data loaded!")
      router.refresh()
    } catch {
      toast.error("Failed to load demo data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/30">
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-500" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              New to VendoFlow?
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Load sample products, customers, and sales to explore the app.
            </p>
          </div>
        </div>
        <Button
          onClick={handleLoadDemo}
          disabled={loading}
          size="sm"
          className="shrink-0"
        >
          {loading ? "Loading…" : "Load demo data"}
        </Button>
      </CardContent>
    </Card>
  )
}
