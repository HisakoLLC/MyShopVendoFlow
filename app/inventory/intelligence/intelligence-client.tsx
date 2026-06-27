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
        <TabsList className="flex items-center gap-8 bg-transparent border-b border-border w-full h-auto p-0 rounded-none justify-start">
          <TabsTrigger 
            value="deadstock" 
            className="rounded-none border-b-2 border-transparent px-0 pb-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground data-[state=active]:border-[#E8400C] data-[state=active]:text-foreground bg-transparent shadow-none transition-all"
          >
            Dead Stock
          </TabsTrigger>
          <TabsTrigger 
            value="lowstock" 
            className="rounded-none border-b-2 border-transparent px-0 pb-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground data-[state=active]:border-[#E8400C] data-[state=active]:text-foreground bg-transparent shadow-none transition-all"
          >
            Low Stock Alerts
          </TabsTrigger>
          <TabsTrigger 
            value="health" 
            className="rounded-none border-b-2 border-transparent px-0 pb-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground data-[state=active]:border-[#E8400C] data-[state=active]:text-foreground bg-transparent shadow-none transition-all"
          >
            Stock Health
          </TabsTrigger>
          <TabsTrigger 
            value="heatmap" 
            className="rounded-none border-b-2 border-transparent px-0 pb-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground data-[state=active]:border-[#E8400C] data-[state=active]:text-foreground bg-transparent shadow-none transition-all"
          >
            Size/Color Heatmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deadstock" className="space-y-6 outline-none">
          <div className="grid gap-6">
            <div className="rounded-lg border border-border bg-card shadow-sm p-8 flex items-center justify-between">
              <div>
                <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  Total Dead Stock Value
                </div>
                <div className="font-sans text-5xl font-bold text-foreground tracking-tight">
                  {formatPrice(totalDeadStockValue)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Impacted Items</div>
                <div className="font-mono text-2xl font-bold text-foreground">
                  {deadStock.length}
                </div>
              </div>
            </div>

            {deadStock.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No dead stock found. Great job!
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Style & Variant</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">SKU</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Stock</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Sell-Through</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Inv Value</TableHead>
                      <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadStock.map((item) => (
                      <TableRow key={item.variant_id} className="border-b border-border hover:bg-accent/50 transition-colors last:border-0 group">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.product_variants?.product_styles?.image_url && (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border">
                                <Image
                                  src={item.product_variants.product_styles.image_url}
                                  alt={item.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-sans text-sm font-bold text-foreground transition-colors">
                                {item.product_variants?.product_styles?.name || "Unknown"}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                                {item.product_variants?.size} / {item.product_variants?.color}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-mono text-[10px] text-muted-foreground">
                          {item.product_variants?.sku}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-foreground">
                          {item.stock}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <span className="font-mono text-sm font-bold text-red-500">
                            {formatPercent(item.sell_through_90d)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <span className="font-mono text-sm font-bold text-foreground">
                            {formatPrice(item.inventoryValue)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-md bg-transparent border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all text-[10px] font-bold uppercase tracking-widest"
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
          <div className="rounded-lg border border-border bg-card shadow-sm p-8 flex items-center justify-between">
            <div>
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                Critical Stock Alerts
              </div>
              <div className="font-sans text-5xl font-bold text-foreground tracking-tight">
                {lowStockAlerts.length}
              </div>
            </div>
            <div className="text-right text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Action Required
            </div>
          </div>

          {lowStockAlerts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              All variants are well-stocked.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Product Variant</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Stock</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Avg Sales</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Runway</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockAlerts.map((item) => (
                    <TableRow key={item.variant_id} className="border-b border-border hover:bg-accent/50 transition-colors last:border-0 group">
                      <TableCell className="px-6 py-4">
                        <div className="font-sans text-sm font-bold text-foreground transition-colors">
                          {item.product_variants?.product_styles?.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          {item.product_variants?.size} / {item.product_variants?.color}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right font-mono text-sm text-foreground">
                        {item.stock}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right font-mono text-[10px] text-muted-foreground">
                        {item.avg_daily_sales_30d?.toFixed(2)} / day
                      </TableCell>
                      <TableCell className={`px-6 py-4 text-right font-mono text-sm font-bold ${item.daysRemaining < 3 ? 'text-red-500' : 'text-yellow-500'}`}>
                        {item.isOutOfStock ? "STOCKED OUT" : `${item.daysRemaining.toFixed(1)} DAYS`}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 rounded-md bg-transparent border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all text-[10px] font-bold uppercase tracking-widest"
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
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">Healthy</span>
                <Package className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="font-sans text-4xl font-bold text-foreground">{stockHealthSummary.healthy}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">{stockHealthSummary.healthyPercent.toFixed(1)}% of variants</div>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">Low Stock</span>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="font-sans text-4xl font-bold text-foreground">{stockHealthSummary.lowStock}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">{stockHealthSummary.lowStockPercent.toFixed(1)}% of variants</div>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">Dead stock</span>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <div className="font-sans text-4xl font-bold text-foreground">{stockHealthSummary.deadStock}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">{stockHealthSummary.deadStockPercent.toFixed(1)}% of variants</div>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">Out of stock</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="font-sans text-4xl font-bold text-foreground">{stockHealthSummary.outOfStock}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">{stockHealthSummary.outOfStockPercent.toFixed(1)}% of variants</div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-sans text-2xl font-bold text-foreground">All Variants</h3>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">FILTER BY STOCK HEALTH STATUS</p>
              </div>
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="w-[200px] h-10 bg-card border-border text-foreground rounded-md shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="dead_stock">Dead Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Style & Variant</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Stock</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Sell-Through</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">Runway</TableHead>
                    <TableHead className="px-6 py-4 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHealthVariants.map((vm) => {
                    const stock = inventoryByVariant[vm.variant_id] || 0
                    const healthStatus = getEffectiveStockHealth(vm, stock)
                    const healthColor =
                      healthStatus === "healthy"
                        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                        : healthStatus === "low_stock"
                          ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
                          : healthStatus === "dead_stock"
                            ? "text-red-500 bg-red-500/10 border-red-500/20"
                            : "text-muted-foreground bg-muted border-border"

                    return (
                      <TableRow key={vm.variant_id} className="border-b border-border hover:bg-accent/50 transition-colors last:border-0 group">
                        <TableCell className="px-6 py-4">
                          <div className="font-sans text-sm font-bold text-foreground transition-colors">
                            {vm.product_variants?.product_styles?.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                            {vm.product_variants?.size} / {vm.product_variants?.color}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-foreground">
                          {stock}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-foreground">
                          {formatPercent(vm.sell_through_90d)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-foreground">
                          {vm.days_of_inventory?.toFixed(1) || "0.0"}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className={`${healthColor} rounded-md px-2 py-0.5 border text-[10px] font-bold uppercase tracking-widest shadow-none`}>
                            {healthStatus.replace("_", " ")}
                          </Badge>
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
          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="flex-1">
                <h3 className="font-sans text-2xl font-bold text-foreground mb-1">Performance Heatmap</h3>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">VISUALIZE SELL-THROUGH BY SIZE AND COLOR</p>
                
                <div className="max-w-md">
                  <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                    <SelectTrigger className="w-full h-11 bg-background border-border text-foreground rounded-md shadow-sm">
                      <SelectValue placeholder="Select a product style" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
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
                  <div className="h-3 w-3 rounded-sm bg-emerald-500/20 border border-emerald-500/50"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">High (&gt;50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-yellow-500/20 border border-yellow-500/50"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Med (25-50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-red-500/20 border border-red-500/50"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Low (&lt;25%)</span>
                </div>
              </div>
            </div>

            {!selectedStyleId ? (
              <div className="py-24 text-center border border-dashed border-border rounded-lg">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">Please select a style to begin</p>
              </div>
            ) : !heatmapData ? (
              <div className="py-24 text-center border border-dashed border-border rounded-lg">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">No data available for this style</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="h-14 border border-border bg-muted/40 p-4 text-left align-middle text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                        Color / Size
                      </th>
                      {heatmapData.colors.map((color) => (
                        <th key={color} className="h-14 border border-border bg-muted/40 p-4 text-center align-middle text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                          {color}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.sizes.map((size) => (
                      <tr key={size}>
                        <td className="w-40 border border-border bg-muted/40 p-4 font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          {size}
                        </td>
                        {heatmapData.colors.map((color) => {
                          const cell = heatmapData.matrix[size]?.[color] || { stock: 0, sellThrough: 0 }
                          const colorClass = cell.sellThrough > 50 
                            ? "bg-emerald-500/10 border-emerald-500/20" 
                            : cell.sellThrough >= 25 
                              ? "bg-yellow-500/10 border-yellow-500/20" 
                              : "bg-red-500/10 border-red-500/20"
                          
                          return (
                            <td key={`${size}-${color}`} className={`border border-border p-6 text-center transition-all ${colorClass}`}>
                              <div className="font-sans text-2xl font-bold text-foreground mb-1">{cell.stock}</div>
                              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
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
