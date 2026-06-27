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
        <div className="rounded-lg border border-border bg-card p-6 mb-6">
          <h2 className="font-sans text-xl font-bold tracking-tight text-foreground mb-1">Tax Rate</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Set the tax rate (VAT) for your store. Kenya standard: 16% VAT.
          </p>
            {stores.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete onboarding to set up your store.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {stores.map((store) => (
                  <div
                    key={store.store_id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">{store.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Current rate: {store.tax_rate ? `${store.tax_rate}%` : "Not set"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={taxRates[store.store_id] ?? ""}
                          onChange={(e) => handleTaxRateChange(store.store_id, e.target.value)}
                          className="font-mono bg-background border border-border rounded-md text-sm text-foreground h-9 w-20 px-3 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C]"
                          placeholder="16.00"
                        />
                        <span className="text-sm text-muted-foreground mx-2">%</span>
                      </div>
                      <button
                        onClick={() => handleSaveTaxRate(store.store_id)}
                        disabled={savingStoreId === store.store_id}
                        className="border border-border text-foreground hover:bg-accent rounded-md h-7 px-3 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors disabled:opacity-50"
                      >
                        {savingStoreId === store.store_id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        {/* Multi-Rate Tax */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-sans text-xl font-bold tracking-tight text-foreground mb-1">Multi-Rate Tax</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Configure multiple tax rates (e.g., City Tax + County Tax).
          </p>
          <div>
            {!isCoreOrScale ? (
              <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg px-4 py-3 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-blue-400">
                    Upgrade Required
                  </div>
                  <div className="mt-1 text-sm text-blue-400/80">
                    Multi-rate tax support is available on Core and Scale plans. Upgrade to
                    configure multiple tax rates (e.g., City Tax 8% + County Tax 0.5%).
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg px-4 py-3 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-blue-400">
                    Multi-Rate Tax Available
                  </div>
                  <div className="mt-1 text-sm text-blue-400/80">
                    Multi-rate tax configuration will be available in a future update. For now,
                    use the single tax rate above.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
