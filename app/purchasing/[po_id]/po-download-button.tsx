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
      const response = await fetch(`/api/po/${poId}/pdf`, {
        credentials: "include",
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("PDF API error:", response.status, errorText)
        throw new Error(`Server error: ${response.status} ${errorText}`)
      }

      if (response.headers.get("content-type") !== "application/pdf") {
        console.error("Wrong content type:", response.headers.get("content-type"))
        throw new Error("Received non-PDF response from server")
      }

      const blob = await response.blob()
      if (blob.size === 0) {
        throw new Error("Received empty PDF file")
      }

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
      toast.error(error instanceof Error ? error.message : "Could not download PDF. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="gap-2 rounded-md border-border text-foreground hover:bg-accent" 
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
