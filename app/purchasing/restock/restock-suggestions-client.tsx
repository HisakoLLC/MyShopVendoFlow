"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency as formatCurrencyLib } from "@/lib/format-currency"

type RestockSuggestion = {
  variant_id: string
  style_id: string
  style_name: string
  style_image_url: string | null
  size: string
  color: string
  sku: string
  current_stock: number
  avg_daily_sales_30d: number
  days_remaining: number
  suggested_qty: number
  unit_cost: number
  line_total: number
  restock_urgency_score: number
}

type RestockSuggestionsClientProps = {
  suggestions: RestockSuggestion[]
  currency?: string
}

type SelectedItem = {
  variant_id: string
  quantity: number
}

function getUrgencyColor(daysRemaining: number): string {
  if (daysRemaining < 3) {
    return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
  }
  if (daysRemaining < 7) {
    return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/40"
  }
  return ""
}

export function RestockSuggestionsClient({ suggestions, currency = "KES" }: RestockSuggestionsClientProps) {
  const formatCurrency = (amount: number) =>
    formatCurrencyLib(amount, currency, { maximumFractionDigits: 2 })
  const router = useRouter()
  const [selectedVariants, setSelectedVariants] = React.useState<Set<string>>(new Set())
  const [quantities, setQuantities] = React.useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    suggestions.forEach((s) => {
      initial[s.variant_id] = s.suggested_qty
    })
    return initial
  })

  const allSelected = selectedVariants.size === suggestions.length && suggestions.length > 0

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVariants(new Set(suggestions.map((s) => s.variant_id)))
    } else {
      setSelectedVariants(new Set())
    }
  }

  const handleSelectVariant = (variantId: string, checked: boolean) => {
    const newSelected = new Set(selectedVariants)
    if (checked) {
      newSelected.add(variantId)
    } else {
      newSelected.delete(variantId)
    }
    setSelectedVariants(newSelected)
  }

  const handleQuantityChange = (variantId: string, value: string) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 1) {
      setQuantities((prev) => ({
        ...prev,
        [variantId]: numValue,
      }))
    }
  }

  const RESTOCK_ITEMS_KEY = "purchasing_new_restock_items"

  const handleCreatePO = () => {
    if (selectedVariants.size === 0) {
      return
    }

    const selectedItems: SelectedItem[] = Array.from(selectedVariants).map((variantId) => ({
      variant_id: variantId,
      quantity: quantities[variantId] || 1,
    }))

    const itemsJson = JSON.stringify(selectedItems)
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(RESTOCK_ITEMS_KEY, itemsJson)
    }
    router.push("/purchasing/new?from=restock")
  }

  const totalSelected = selectedVariants.size
  const totalValue = Array.from(selectedVariants).reduce((sum, variantId) => {
    const suggestion = suggestions.find((s) => s.variant_id === variantId)
    if (!suggestion) return sum
    const qty = quantities[variantId] || suggestion.suggested_qty
    return sum + qty * suggestion.unit_cost
  }, 0)

  if (suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No restock suggestions at this time. All variants have sufficient inventory.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-background p-4 dark:border-zinc-800 dark:bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select All ({totalSelected} selected)
            </label>
          </div>
          {totalSelected > 0 && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Total: {formatCurrency(totalValue)}
            </div>
          )}
        </div>
        <Button
          onClick={handleCreatePO}
          disabled={totalSelected === 0}
          className="gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Create PO from Selected ({totalSelected})
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Style</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Avg Daily Sales</TableHead>
              <TableHead className="text-right">Days Remaining</TableHead>
              <TableHead className="text-right">Suggested Qty</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions.map((suggestion) => {
              const isSelected = selectedVariants.has(suggestion.variant_id)
              const qty = quantities[suggestion.variant_id] || suggestion.suggested_qty
              const lineTotal = qty * suggestion.unit_cost
              const urgencyColor = getUrgencyColor(suggestion.days_remaining)

              return (
                <TableRow
                  key={suggestion.variant_id}
                  className={urgencyColor}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleSelectVariant(suggestion.variant_id, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {suggestion.style_image_url ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <Image
                            src={suggestion.style_image_url}
                            alt={suggestion.style_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                          No Image
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                          {suggestion.style_name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-900 dark:text-zinc-100">
                      {suggestion.size} / {suggestion.color}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                      {suggestion.sku}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {suggestion.current_stock}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {suggestion.avg_daily_sales_30d.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={`font-medium ${
                        suggestion.days_remaining < 3
                          ? "text-red-600 dark:text-red-400"
                          : suggestion.days_remaining < 7
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {suggestion.days_remaining.toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => handleQuantityChange(suggestion.variant_id, e.target.value)}
                      className="w-20 text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatCurrency(suggestion.unit_cost)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(lineTotal)}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
