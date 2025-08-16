"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"
import { getStoreSettings, updateStoreSetting, type StoreInfo } from "@/lib/actions/settings-actions"

export function StoreSettings() {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: "VendaFlow POS",
    address: "123 Main Street, City, Country",
    phone: "Phone: +1 234 567 890",
    email: "Email: info@vendaflow.com",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        console.log("Client: Loading store settings...")
        const settings = await getStoreSettings()
        console.log("Client: Store settings loaded:", settings)
        setStoreInfo(settings)
      } catch (error) {
        console.error("Client: Error loading store settings:", error)
        toast({
          title: "Error",
          description: "Failed to load store settings. Using default values.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setStoreInfo((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      console.log("Client: Saving store settings:", storeInfo)
      // Update each setting
      const settingsToUpdate = [
        { key: "store_name", value: storeInfo.name },
        { key: "store_address", value: storeInfo.address },
        { key: "store_phone", value: storeInfo.phone },
        { key: "store_email", value: storeInfo.email },
      ]

      for (const { key, value } of settingsToUpdate) {
        const result = await updateStoreSetting(key, value)
        if (!result.success) {
          throw new Error(`Failed to update ${key}: ${result.error}`)
        }
      }

      toast({
        title: "Success",
        description: "Store settings updated successfully",
      })
    } catch (error) {
      console.error("Client: Error saving store settings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save store settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Information</CardTitle>
        <CardDescription>Configure your store details that will appear on receipts and other documents</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="store-name">Store Name</Label>
                <Input
                  id="store-name"
                  name="name"
                  value={storeInfo.name}
                  onChange={handleChange}
                  placeholder="Your Store Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-address">Address</Label>
                <Input
                  id="store-address"
                  name="address"
                  value={storeInfo.address}
                  onChange={handleChange}
                  placeholder="123 Main St, City, Country"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-phone">Phone Number</Label>
                <Input
                  id="store-phone"
                  name="phone"
                  value={storeInfo.phone}
                  onChange={handleChange}
                  placeholder="+1 234 567 890"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-email">Email Address</Label>
                <Input
                  id="store-email"
                  name="email"
                  type="email"
                  value={storeInfo.email}
                  onChange={handleChange}
                  placeholder="info@yourstore.com"
                  required
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
