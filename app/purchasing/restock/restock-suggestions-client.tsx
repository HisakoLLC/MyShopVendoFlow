"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ShoppingCart, Package } from "lucide-react"

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

// Removed row-based urgency background color logic

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
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          No restock suggestions at this time. All variants have sufficient inventory.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card text-card-foreground p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
            >
              Select All ({totalSelected} selected)
            </label>
          </div>
          {totalSelected > 0 && (
            <div className="text-sm text-muted-foreground font-mono">
              Total: {formatCurrency(totalValue)}
            </div>
          )}
        </div>
        <Button
          onClick={handleCreatePO}
          disabled={totalSelected === 0}
          className="gap-2 bg-[#E8400C] text-white hover:bg-[#c73508]"
        >
          <ShoppingCart className="h-4 w-4" />
          Create PO from Selected ({totalSelected})
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Style</TableHead>
              <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Variant</TableHead>
              <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">SKU</TableHead>
              <TableHead className="text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Current Stock</TableHead>
              <TableHead className="text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Avg Daily Sales</TableHead>
              <TableHead className="text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Days Remaining</TableHead>
              <TableHead className="text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Suggested Qty</TableHead>
              <TableHead className="text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Unit Cost</TableHead>
              <TableHead className="text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions.map((suggestion) => {
              const isSelected = selectedVariants.has(suggestion.variant_id)
              const qty = quantities[suggestion.variant_id] || suggestion.suggested_qty
              const lineTotal = qty * suggestion.unit_cost
              return (
                <TableRow
                  key={suggestion.variant_id}
                  className="border-b border-border hover:bg-accent/50 transition-colors"
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
                      <div className={suggestion.style_image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted"}>
                        {suggestion.style_image_url ? (
                          <Image
                            src={suggestion.style_image_url}
                            alt={suggestion.style_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {suggestion.style_name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {suggestion.size} / {suggestion.color}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs text-muted-foreground tracking-wide">
                      {suggestion.sku}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium text-foreground font-mono tabular-nums">
                      {suggestion.current_stock}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-muted-foreground font-mono tabular-nums">
                      {suggestion.avg_daily_sales_30d.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={`font-semibold font-mono tabular-nums ${
                        suggestion.days_remaining < 3
                          ? "text-red-500"
                          : suggestion.days_remaining < 7
                            ? "text-amber-500"
                            : "text-foreground"
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
                      className="w-20 text-right bg-background border border-border rounded-md h-8 font-mono text-sm text-foreground focus:ring-1 focus:ring-[#E8400C]"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-muted-foreground font-mono tabular-nums">
                      {formatCurrency(suggestion.unit_cost)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold text-foreground font-mono tabular-nums">
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
