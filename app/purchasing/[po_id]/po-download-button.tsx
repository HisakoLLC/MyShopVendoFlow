"use client"

import * as React from "react"
import { Printer, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface PODownloadButtonProps {
  poId: string
  poNumber: string
}

export function PODownloadButton({ poId, poNumber }: PODownloadButtonProps) {
  const [isDownloading, setIsDownloading] = React.useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/po/${poId}/pdf`)
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `PO-${poNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success("PO PDF downloaded successfully")
    } catch (error) {
      console.error("PDF download error:", error)
      toast.error("Could not download PDF. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="gap-2" 
      onClick={handleDownload} 
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      {isDownloading ? "Generating..." : "Download PDF"}
    </Button>
  )
}
