"use client"

import { useEffect, useState } from "react"

export function DbInitializer() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeDb = async () => {
      try {
        setStatus("loading")
        const response = await fetch("/api/init-db")
        const data = await response.json()

        if (data.success) {
          setStatus("success")
        } else {
          setStatus("error")
          setError(data.error || "Unknown error")
        }
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    }

    initializeDb()
  }, [])

  return null // This component doesn't render anything
}
