"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { TrendingDown, AlertTriangle, Package, BarChart3, DollarSign } from "lucide-react"

interface VariantMetric {
  variant_id: string
  sell_through_30d: number | null
  sell_through_60d: number | null
  sell_through_90d: number | null
  avg_daily_sales_30d: number | null
  days_of_inventory: number | null
  restock_urgency_score: number | null
  stock_health: string | null
  product_variants: {
    size: string
    color: string
    sku: string
    price: number | null
    cost: number | null
    style_id: string | null
    product_styles: {
      name: string
      image_url: string | null
    } | null
  } | null
}

interface ProductStyle {
  style_id: string
  name: string
  image_url: string | null
}

interface InventoryIntelligenceClientProps {
  variantMetrics: VariantMetric[]
  inventoryByVariant: Record<string, number>
  productStyles: ProductStyle[]
}

export function InventoryIntelligenceClient({
  variantMetrics,
  inventoryByVariant,
  productStyles,
}: InventoryIntelligenceClientProps) {
  const [selectedStyleId, setSelectedStyleId] = React.useState<string>("")

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return "N/A"
    return `${value.toFixed(1)}%`
  }

  // Derive stock_health when not set by metrics job
  const getEffectiveStockHealth = React.useCallback(
    (vm: VariantMetric, stock: number): string => {
      if (stock === 0) return "out_of_stock"
      if (vm.stock_health && vm.stock_health !== "unknown") return vm.stock_health
      const sellThrough = vm.sell_through_90d ?? 0
      const daysInv = vm.days_of_inventory ?? 0
      if (stock > 3 && daysInv > 60 && sellThrough < 10) return "dead_stock"
      if (daysInv > 0 && daysInv < 7) return "low_stock"
      return "healthy"
    },
    []
  )

  // Calculate dead stock
  const deadStock = React.useMemo(() => {
    return variantMetrics
      .filter((vm) => {
        const stock = inventoryByVariant[vm.variant_id] || 0
        const sellThrough = vm.sell_through_90d || 0
        const daysInventory = vm.days_of_inventory || 0
        return sellThrough < 10 && stock > 3 && daysInventory > 60
      })
      .map((vm) => ({
        ...vm,
        stock: inventoryByVariant[vm.variant_id] || 0,
        inventoryValue:
          (inventoryByVariant[vm.variant_id] || 0) * (vm.product_variants?.cost || 0),
      }))
      .sort((a, b) => b.inventoryValue - a.inventoryValue)
  }, [variantMetrics, inventoryByVariant])

  const totalDeadStockValue = deadStock.reduce((sum, item) => sum + item.inventoryValue, 0)

  // Low stock alerts
  const lowStockAlerts = React.useMemo(() => {
    return variantMetrics
      .filter((vm) => {
        const stock = inventoryByVariant[vm.variant_id] || 0
        const daysInventory = vm.days_of_inventory ?? 0
        return stock === 0 || daysInventory < 7
      })
      .map((vm) => {
        const stock = inventoryByVariant[vm.variant_id] || 0
        const avgDaily = vm.avg_daily_sales_30d || 0
        const daysRemaining = stock === 0 ? 0 : (vm.days_of_inventory ?? 0)
        return {
          ...vm,
          stock,
          daysRemaining,
          isOutOfStock: stock === 0,
        }
      })
      .sort((a, b) => {
        if (a.isOutOfStock && !b.isOutOfStock) return -1
        if (!a.isOutOfStock && b.isOutOfStock) return 1
        return a.daysRemaining - b.daysRemaining
      })
  }, [variantMetrics, inventoryByVariant])

  // Calculate stock health summary
  const stockHealthSummary = React.useMemo(() => {
    const total = variantMetrics.length
    let healthy = 0
    let lowStock = 0
    let deadStock = 0
    let outOfStock = 0
    variantMetrics.forEach((vm) => {
      const stock = inventoryByVariant[vm.variant_id] || 0
      const health = getEffectiveStockHealth(vm, stock)
      if (health === "healthy") healthy++
      else if (health === "low_stock") lowStock++
      else if (health === "dead_stock") deadStock++
      else outOfStock++
    })
    return {
      total,
      healthy,
      lowStock,
      deadStock,
      outOfStock,
      healthyPercent: total > 0 ? (healthy / total) * 100 : 0,
      lowStockPercent: total > 0 ? (lowStock / total) * 100 : 0,
      deadStockPercent: total > 0 ? (deadStock / total) * 100 : 0,
      outOfStockPercent: total > 0 ? (outOfStock / total) * 100 : 0,
    }
  }, [variantMetrics, inventoryByVariant, getEffectiveStockHealth])

  // Filter variants by stock health
  const [healthFilter, setHealthFilter] = React.useState<string>("all")
  const filteredHealthVariants = React.useMemo(() => {
    if (healthFilter === "all") return variantMetrics
    return variantMetrics.filter((vm) => {
      const stock = inventoryByVariant[vm.variant_id] || 0
      const health = getEffectiveStockHealth(vm, stock)
      return health === healthFilter
    })
  }, [variantMetrics, inventoryByVariant, healthFilter, getEffectiveStockHealth])

  // Heatmap data for selected style
  const heatmapData = React.useMemo(() => {
    if (!selectedStyleId) return null

    const styleVariants = variantMetrics.filter(
      (vm) => vm.product_variants?.style_id === selectedStyleId
    )

    if (styleVariants.length === 0) return null

    const sizes = Array.from(
      new Set(styleVariants.map((v) => v.product_variants?.size).filter(Boolean) as string[])
    ).sort()
    const colors = Array.from(
      new Set(styleVariants.map((v) => v.product_variants?.color).filter(Boolean) as string[])
    ).sort()

    const matrix: Record<string, Record<string, { stock: number; sellThrough: number }>> = {}
    sizes.forEach((size) => {
      matrix[size] = {}
      colors.forEach((color) => {
        const variant = styleVariants.find(
          (v) => v.product_variants?.size === size && v.product_variants?.color === color
        )
        if (variant) {
          matrix[size][color] = {
            stock: inventoryByVariant[variant.variant_id] || 0,
            sellThrough: variant.sell_through_90d || 0,
          }
        } else {
          matrix[size][color] = { stock: 0, sellThrough: 0 }
        }
      })
    })

    return { sizes, colors, matrix }
  }, [selectedStyleId, variantMetrics, inventoryByVariant])

  return (
    <div className="space-y-8">
      <Tabs defaultValue="deadstock" className="space-y-8">
        <TabsList className="flex border-b border-zinc-800 mb-6 bg-transparent h-auto p-0 rounded-none w-full justify-start">
          <TabsTrigger 
            value="deadstock" 
            className="px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer transition-colors rounded-none border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 data-[state=active]:border-white data-[state=active]:text-zinc-100 bg-transparent shadow-none"
          >
            Dead Stock
          </TabsTrigger>
          <TabsTrigger 
            value="lowstock" 
            className="px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer transition-colors rounded-none border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 data-[state=active]:border-white data-[state=active]:text-zinc-100 bg-transparent shadow-none"
          >
            Low Stock Alerts
          </TabsTrigger>
          <TabsTrigger 
            value="health" 
            className="px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer transition-colors rounded-none border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 data-[state=active]:border-white data-[state=active]:text-zinc-100 bg-transparent shadow-none"
          >
            Stock Health
          </TabsTrigger>
          <TabsTrigger 
            value="heatmap" 
            className="px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer transition-colors rounded-none border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 data-[state=active]:border-white data-[state=active]:text-zinc-100 bg-transparent shadow-none"
          >
            Size/Color Heatmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deadstock" className="space-y-6 outline-none">
          <div className="grid gap-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 flex items-center justify-between">
              <div>
                <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-3 flex items-center gap-2">
                  <TrendingDown className="h-3 w-3 text-red-400" />
                  Total Dead Stock Value
                </div>
                <div className="font-editorial text-3xl font-bold text-zinc-50">
                  {formatPrice(totalDeadStockValue)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-1">Impacted Items</div>
                <div className="font-mono text-xl font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-sm">
                  {deadStock.length}
                </div>
              </div>
            </div>

            {deadStock.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                No dead stock found. Great job!
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-950/50">
                    <TableRow className="border-b-2 border-zinc-800 hover:bg-transparent">
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Style & Variant</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500">SKU</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Stock</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Sell-Through</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Inv Value</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadStock.map((item) => (
                      <TableRow key={item.variant_id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors last:border-0 group">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.product_variants?.product_styles?.image_url && (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-zinc-800">
                                <Image
                                  src={item.product_variants.product_styles.image_url}
                                  alt={item.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-editorial text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                                {item.product_variants?.product_styles?.name || "Unknown"}
                              </div>
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                                {item.product_variants?.size} / {item.product_variants?.color}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-mono text-[10px] text-zinc-400">
                          {item.product_variants?.sku}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-zinc-300">
                          {item.stock}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <span className="font-mono text-sm font-bold text-red-400">
                            {formatPercent(item.sell_through_90d)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <span className="font-mono text-sm font-bold text-zinc-100">
                            {formatPrice(item.inventoryValue)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-sm bg-transparent border-zinc-700 text-zinc-400 hover:bg-white hover:text-zinc-950 hover:border-white transition-all text-[10px] font-bold uppercase tracking-widest"
                          >
                            Markdown
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="lowstock" className="space-y-6 outline-none">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 flex items-center justify-between">
            <div>
              <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-yellow-400" />
                Critical Stock Alerts
              </div>
              <div className="font-editorial text-3xl font-bold text-zinc-50">
                {lowStockAlerts.length}
              </div>
            </div>
            <div className="text-right text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">
              Action Required
            </div>
          </div>

          {lowStockAlerts.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              All variants are well-stocked.
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-950/50">
                  <TableRow className="border-b-2 border-zinc-800 hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Product Variant</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Stock</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Avg Sales</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Runway</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockAlerts.map((item) => (
                    <TableRow key={item.variant_id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors last:border-0 group">
                      <TableCell className="px-6 py-4">
                        <div className="font-editorial text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                          {item.product_variants?.product_styles?.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                          {item.product_variants?.size} / {item.product_variants?.color}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right font-mono text-sm text-zinc-300">
                        {item.stock}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right font-mono text-[10px] text-zinc-400">
                        {item.avg_daily_sales_30d?.toFixed(2)} / day
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {item.isOutOfStock ? (
                          <span className="bg-red-400/10 text-red-400 border border-red-400/20 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 inline-block">STOCKED OUT</span>
                        ) : (
                          <span className={`${item.daysRemaining < 3 ? 'text-red-400' : 'text-yellow-400'} font-mono text-sm font-bold`}>
                            {item.daysRemaining.toFixed(1)} DAYS
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-7 px-3 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors"
                        >
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-8 outline-none">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Healthy</span>
                <Package className="h-4 w-4 text-green-400/50" />
              </div>
              <div className="font-editorial text-3xl font-bold text-zinc-50">{stockHealthSummary.healthy}</div>
              <div className="text-xs text-zinc-500 mt-1">{stockHealthSummary.healthyPercent.toFixed(1)}% OF VARIANTS</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Low Stock</span>
                <AlertTriangle className="h-4 w-4 text-yellow-400/50" />
              </div>
              <div className="font-editorial text-3xl font-bold text-zinc-50">{stockHealthSummary.lowStock}</div>
              <div className="text-xs text-zinc-500 mt-1">{stockHealthSummary.lowStockPercent.toFixed(1)}% OF VARIANTS</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Dead stock</span>
                <TrendingDown className="h-4 w-4 text-red-400/50" />
              </div>
              <div className="font-editorial text-3xl font-bold text-zinc-50">{stockHealthSummary.deadStock}</div>
              <div className="text-xs text-zinc-500 mt-1">{stockHealthSummary.deadStockPercent.toFixed(1)}% OF VARIANTS</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Out of stock</span>
                <DollarSign className="h-4 w-4 text-zinc-600" />
              </div>
              <div className="font-editorial text-3xl font-bold text-zinc-50">{stockHealthSummary.outOfStock}</div>
              <div className="text-xs text-zinc-500 mt-1">{stockHealthSummary.outOfStockPercent.toFixed(1)}% OF VARIANTS</div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-xl font-bold text-zinc-50">All Variants</h3>
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">FILTER BY STOCK HEALTH STATUS</p>
              </div>
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="w-[200px] h-9 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="dead_stock">Dead Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-950/50">
                  <TableRow className="border-b-2 border-zinc-800 hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Style & Variant</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Stock</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Sell-Through</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500 text-right">Runway</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-zinc-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHealthVariants.map((vm) => {
                    const stock = inventoryByVariant[vm.variant_id] || 0
                    const healthStatus = getEffectiveStockHealth(vm, stock)
                    const healthColor =
                      healthStatus === "healthy"
                        ? "text-green-400 bg-green-400/10 border-green-500/20"
                        : healthStatus === "low_stock"
                          ? "text-yellow-400 bg-yellow-400/10 border-yellow-500/20"
                          : healthStatus === "dead_stock"
                            ? "text-red-400 bg-red-400/10 border-red-500/20"
                            : "text-zinc-500 bg-zinc-500/10 border-zinc-500/20"

                    return (
                      <TableRow key={vm.variant_id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors last:border-0 group">
                        <TableCell className="px-6 py-4">
                          <div className="font-editorial text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                            {vm.product_variants?.product_styles?.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                            {vm.product_variants?.size} / {vm.product_variants?.color}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-zinc-300">
                          {stock}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-zinc-300">
                          {formatPercent(vm.sell_through_90d)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-zinc-300">
                          {vm.days_of_inventory?.toFixed(1) || "0.0"}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {healthStatus === "out_of_stock" ? (
                            <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 inline-block">OUT OF STOCK</span>
                          ) : healthStatus === "healthy" ? (
                            <span className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 inline-block">HEALTHY</span>
                          ) : healthStatus === "low_stock" ? (
                            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 inline-block">LOW STOCK</span>
                          ) : (
                            <span className="bg-red-400/10 text-red-400 border border-red-400/20 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 inline-block">DEAD STOCK</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-6 outline-none">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="flex-1">
                <h3 className="font-editorial text-2xl font-bold text-zinc-50 mb-1">Performance Heatmap</h3>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">VISUALIZE SELL-THROUGH BY SIZE AND COLOR</p>
                
                <div className="max-w-md">
                  <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                    <SelectTrigger className="w-full h-11 bg-zinc-950 border-zinc-800 text-zinc-100 rounded-sm">
                      <SelectValue placeholder="Select a product style" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {productStyles.map((style) => (
                        <SelectItem key={style.style_id} value={style.style_id}>
                          {style.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-green-400/20 border border-green-500/50"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">High (&gt;50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-yellow-400/20 border border-yellow-500/50"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Med (25-50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-red-400/20 border border-red-500/50"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Low (&lt;25%)</span>
                </div>
              </div>
            </div>

            {!selectedStyleId ? (
              <div className="py-24 text-center border border-dashed border-zinc-800 rounded-lg">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-600">Please select a style to begin</p>
              </div>
            ) : !heatmapData ? (
              <div className="py-24 text-center border border-dashed border-zinc-800 rounded-lg">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-600">No data available for this style</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="h-14 border border-zinc-800 bg-zinc-950 p-4 text-left align-middle text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">
                        Color / Size
                      </th>
                      {heatmapData.colors.map((color) => (
                        <th key={color} className="h-14 border border-zinc-800 bg-zinc-950 p-4 text-center align-middle text-[0.65rem] font-bold tracking-[0.2em] uppercase text-zinc-500">
                          {color}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.sizes.map((size) => (
                      <tr key={size}>
                        <td className="w-40 border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest">
                          {size}
                        </td>
                        {heatmapData.colors.map((color) => {
                          const cell = heatmapData.matrix[size]?.[color] || { stock: 0, sellThrough: 0 }
                          const colorClass = cell.sellThrough > 50 
                            ? "bg-green-400/10 border-green-500/20" 
                            : cell.sellThrough >= 25 
                              ? "bg-yellow-400/10 border-yellow-500/20" 
                              : "bg-red-400/10 border-red-500/20"
                          
                          return (
                            <td key={`${size}-${color}`} className={`border border-zinc-800 p-6 text-center transition-all ${colorClass}`}>
                              <div className="font-editorial text-2xl font-bold text-zinc-50 mb-1">{cell.stock}</div>
                              <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                                {cell.sellThrough.toFixed(1)}%
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
