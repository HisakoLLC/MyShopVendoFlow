"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface GoBackProps {
  className?: string
  variant?: "default" | "ghost" | "outline"
  fallbackPath?: string
  label?: string
}

export function GoBack({ className, variant = "ghost", fallbackPath = "/dashboard", label = "Back" }: GoBackProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Don't show on root or dashboard page
  if (pathname === "/" || pathname === "/dashboard") {
    return null
  }

  const handleGoBack = () => {
    // Try to go back in history first
    try {
      window.history.length > 1 ? router.back() : router.push(fallbackPath)
    } catch (error) {
      // Fallback to dashboard if there's an error
      router.push(fallbackPath)
    }
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleGoBack}
      className={cn("gap-1 font-medium", className)}
      aria-label="Go back"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Button>
  )
}
