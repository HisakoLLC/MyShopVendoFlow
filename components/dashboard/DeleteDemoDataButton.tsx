"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * One-button UI to delete all demo data. Shown when the account has demo data.
 */
export function DeleteDemoDataButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (
      !confirm(
        "Remove all demo data? This will delete sample products, customers, sales, and related data. This cannot be undone."
      )
    ) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/delete-demo", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Failed to delete demo data")
        return
      }
      toast.success("All demo data has been removed.")
      router.refresh()
    } catch {
      toast.error("Failed to delete demo data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-zinc-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-800/50"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {loading ? "Removing…" : "Delete all demo data"}
    </Button>
  )
}
