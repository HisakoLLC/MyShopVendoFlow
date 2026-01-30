"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Info } from "lucide-react"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateStoreTaxRate } from "./actions"
import { Toaster } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Store = {
  store_id: string
  name: string
  tax_rate: number | null
}

type TaxSettingsTabProps = {
  stores: Store[]
  planTier: string
}

const taxRateSchema = z.object({
  tax_rate: z.number().min(0, "Tax rate cannot be negative.").max(100, "Tax rate cannot exceed 100%."),
})

export function TaxSettingsTab({ stores, planTier }: TaxSettingsTabProps) {
  const [savingStoreId, setSavingStoreId] = React.useState<string | null>(null)
  const [taxRates, setTaxRates] = React.useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {}
    stores.forEach((store) => {
      initial[store.store_id] = store.tax_rate ?? 16.0 // Default to 16% VAT for Kenya
    })
    return initial
  })

  const handleTaxRateChange = (storeId: string, value: string) => {
    const numValue = value === "" ? null : parseFloat(value)
    setTaxRates((prev) => ({ ...prev, [storeId]: numValue }))
  }

  const handleSaveTaxRate = async (storeId: string) => {
    setSavingStoreId(storeId)
    try {
      const taxRate = taxRates[storeId]
      await updateStoreTaxRate({
        store_id: storeId,
        tax_rate: taxRate ?? undefined,
      })
      toast.success("Tax rate updated successfully!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tax rate.")
    } finally {
      setSavingStoreId(null)
    }
  }

  const isCoreOrScale = planTier === "core" || planTier === "scale"

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="space-y-6">
        {/* Tax Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Rate</CardTitle>
            <CardDescription>
              Set the tax rate (VAT) for your store. Kenya standard: 16% VAT.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stores.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Complete onboarding to set up your store.
              </p>
            ) : (
              stores.map((store) => (
                <div
                  key={store.store_id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{store.name}</div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Current rate: {store.tax_rate ? `${store.tax_rate}%` : "Not set"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={taxRates[store.store_id] ?? ""}
                        onChange={(e) => handleTaxRateChange(store.store_id, e.target.value)}
                        className="w-24"
                        placeholder="16.00"
                      />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">%</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSaveTaxRate(store.store_id)}
                      disabled={savingStoreId === store.store_id}
                    >
                      {savingStoreId === store.store_id ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Multi-Rate Tax */}
        <Card>
          <CardHeader>
            <CardTitle>Multi-Rate Tax</CardTitle>
            <CardDescription>
              Configure multiple tax rates (e.g., City Tax + County Tax).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isCoreOrScale ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/40 dark:bg-yellow-950/30">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <div className="font-medium text-yellow-900 dark:text-yellow-100">
                      Upgrade Required
                    </div>
                    <div className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
                      Multi-rate tax support is available on Core and Scale plans. Upgrade to
                      configure multiple tax rates (e.g., City Tax 8% + County Tax 0.5%).
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      Multi-Rate Tax Available
                    </div>
                    <div className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                      Multi-rate tax configuration will be available in a future update. For now,
                      use the single tax rate above.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
