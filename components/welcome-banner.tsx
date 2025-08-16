"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useState } from "react"
import { ShoppingBag } from "lucide-react"

export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) {
    return null
  }

  return (
    <Card className="bg-[#8AE234] text-[#1A1A1A] mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="bg-white p-3 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-[#8AE234]" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h3 className="font-bold text-xl">Welcome to VendaFlow – Simple. Fast. Modern.</h3>
              <p className="text-[#1A1A1A]/80 text-sm">
                Manage sales, inventory, and payments — all in one fast, reliable platform built for modern retailers.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-[#1A1A1A] hover:bg-white/90"
              onClick={() => window.open("https://vendoflow.com", "_blank")}
            >
              View Documentation
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-white/20" onClick={() => setIsVisible(false)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
