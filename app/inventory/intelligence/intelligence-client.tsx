"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  // Derive stock_health when not set by metrics job. Stat cards use this; definitions align with tabs:
  // - Out of stock: stock === 0 only.
  // - Dead stock: stock > 3, sell-through 90d < 10%, days of inventory > 60 (matches Dead Stock tab).
  // - Low stock: stock > 0, 0 < days of inventory < 7 (running out soon).
  // - Healthy: everything else with stock > 0.
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

  // Calculate dead stock (sell_through_90d < 10% AND quantity_on_hand > 3 AND days_of_inventory > 60)
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

  // Low stock alerts: days_of_inventory < 7 OR out of stock (most critical first)
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
        const suggestedReorder = Math.max(0, Math.ceil(30 * avgDaily - stock))
        return {
          ...vm,
          stock,
          daysRemaining,
          suggestedReorder,
          isOutOfStock: stock === 0,
        }
      })
      .sort((a, b) => {
        if (a.isOutOfStock && !b.isOutOfStock) return -1
        if (!a.isOutOfStock && b.isOutOfStock) return 1
        return a.daysRemaining - b.daysRemaining
      })
  }, [variantMetrics, inventoryByVariant])

  // Calculate stock health summary (use derived health when stock_health is null)
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
      if (healthFilter === "out_of_stock") return health === "out_of_stock"
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

    // Extract unique sizes and colors
    const sizes = Array.from(
      new Set(styleVariants.map((v) => v.product_variants?.size).filter(Boolean) as string[])
    ).sort()
    const colors = Array.from(
      new Set(styleVariants.map((v) => v.product_variants?.color).filter(Boolean) as string[])
    ).sort()

    // Build matrix
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

  const getSellThroughColor = (sellThrough: number) => {
    if (sellThrough > 50) return "bg-green-100 dark:bg-green-900/30 border-green-500"
    if (sellThrough >= 25) return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500"
    return "bg-red-100 dark:bg-red-900/30 border-red-500"
  }

  const getDaysRemainingColor = (days: number) => {
    if (days < 3) return "text-red-600 dark:text-red-400 font-semibold"
    if (days < 7) return "text-yellow-600 dark:text-yellow-400"
    return "text-zinc-600 dark:text-zinc-400"
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Inventory Intelligence
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Advanced analytics for stock optimization and restock planning
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="deadstock" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="deadstock">Dead Stock</TabsTrigger>
            <TabsTrigger value="lowstock">Low Stock Alerts</TabsTrigger>
            <TabsTrigger value="health">Stock Health</TabsTrigger>
            <TabsTrigger value="heatmap">Size/Color Heatmap</TabsTrigger>
          </TabsList>

          {/* Tab 1: Dead Stock */}
          <TabsContent value="deadstock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Dead Stock Analysis
                </CardTitle>
                <CardDescription>
                  Products with low sell-through and high inventory value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Total Dead Stock Value
                      </div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatPrice(totalDeadStockValue)}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {deadStock.length} {deadStock.length === 1 ? "variant" : "variants"}
                    </div>
                  </div>
                </div>

                {deadStock.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    No dead stock found. Great job!
                  </div>
                ) : (
                  <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Style</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Sell-Through (90d)</TableHead>
                          <TableHead className="text-right">Inventory Value</TableHead>
                          <TableHead>Suggested Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deadStock.map((item) => (
                          <TableRow key={item.variant_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.product_variants?.product_styles?.image_url && (
                                  <Image
                                    src={item.product_variants.product_styles.image_url}
                                    alt={item.product_variants.product_styles.name || ""}
                                    width={40}
                                    height={40}
                                    className="rounded"
                                  />
                                )}
                                <span className="font-medium">
                                  {item.product_variants?.product_styles?.name || "Unknown"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.product_variants?.size} / {item.product_variants?.color}
                            </TableCell>
                            <TableCell className="text-zinc-500 dark:text-zinc-400">
                              {item.product_variants?.sku}
                            </TableCell>
                            <TableCell className="text-right">{item.stock}</TableCell>
                            <TableCell className="text-right">
                              {formatPercent(item.sell_through_90d)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPrice(item.inventoryValue)}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                Mark Down 30%
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Low Stock Alerts */}
          <TabsContent value="lowstock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>
                  Variants with less than 7 days of inventory remaining
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockAlerts.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    No low stock alerts. All variants are well-stocked.
                  </div>
                ) : (
                  <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Style</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                          <TableHead className="text-right">Avg Daily Sales (30d)</TableHead>
                          <TableHead className="text-right">Days Remaining</TableHead>
                          <TableHead className="text-right">Suggested Reorder Qty</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockAlerts.map((item) => (
                          <TableRow key={item.variant_id}>
                            <TableCell className="font-medium">
                              {item.product_variants?.product_styles?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {item.product_variants?.size} / {item.product_variants?.color}
                            </TableCell>
                            <TableCell className="text-right">{item.stock}</TableCell>
                            <TableCell className="text-right">
                              {item.avg_daily_sales_30d?.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell className={`text-right ${getDaysRemainingColor(item.daysRemaining)}`}>
                              {item.isOutOfStock ? "Out of stock" : `${item.daysRemaining.toFixed(1)} days`}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.suggestedReorder}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                Create Restock Order
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Stock Health Overview */}
          <TabsContent value="health" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Healthy Stock</CardTitle>
                  <Package className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stockHealthSummary.healthy}</div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {stockHealthSummary.healthyPercent.toFixed(1)}% of variants
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stockHealthSummary.lowStock}</div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {stockHealthSummary.lowStockPercent.toFixed(1)}% of variants
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dead Stock</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stockHealthSummary.deadStock}</div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {stockHealthSummary.deadStockPercent.toFixed(1)}% of variants
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                  <DollarSign className="h-4 w-4 text-zinc-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stockHealthSummary.outOfStock}</div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {stockHealthSummary.outOfStockPercent.toFixed(1)}% of variants
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Variants</CardTitle>
                    <CardDescription>Filter by stock health status</CardDescription>
                  </div>
                  <Select value={healthFilter} onValueChange={setHealthFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="healthy">Healthy</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="dead_stock">Dead Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {variantMetrics.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    No variant metrics yet. Sales and inventory data will populate stock health over time.
                  </div>
                ) : (
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style</TableHead>
                        <TableHead>Variant</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Sell-Through (90d)</TableHead>
                        <TableHead className="text-right">Days of Inventory</TableHead>
                        <TableHead>Health Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHealthVariants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                            No variants match the selected filter
                          </TableCell>
                        </TableRow>
                      ) : filteredHealthVariants.map((vm) => {
                        const stock = inventoryByVariant[vm.variant_id] || 0
                        const healthStatus = getEffectiveStockHealth(vm, stock)
                        const healthColor =
                          healthStatus === "healthy"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : healthStatus === "low_stock"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : healthStatus === "dead_stock"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400"

                        return (
                          <TableRow key={vm.variant_id}>
                            <TableCell className="font-medium">
                              {vm.product_variants?.product_styles?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {vm.product_variants?.size} / {vm.product_variants?.color}
                            </TableCell>
                            <TableCell className="text-right">{stock}</TableCell>
                            <TableCell className="text-right">
                              {formatPercent(vm.sell_through_90d)}
                            </TableCell>
                            <TableCell className="text-right">
                              {vm.days_of_inventory?.toFixed(1) || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge className={healthColor}>
                                {healthStatus.replace("_", " ").toUpperCase()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Size/Color Heatmap */}
          <TabsContent value="heatmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Size/Color Performance Heatmap
                </CardTitle>
                <CardDescription>
                  Visualize sell-through rates by size and color combination
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productStyles.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    No product styles yet. Add products to see the size/color heatmap.
                  </div>
                ) : (
                <div>
                <div className="mb-4">
                  <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Select a product style" />
                    </SelectTrigger>
                    <SelectContent>
                      {productStyles.map((style) => (
                        <SelectItem key={style.style_id} value={style.style_id}>
                          {style.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedStyleId ? (
                  <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    Select a product style to view the heatmap
                  </div>
                ) : !heatmapData ? (
                  <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    No variants found for this style
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded border-2 border-green-500 bg-green-100 dark:bg-green-900/30"></div>
                        <span>Sell-through &gt; 50%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded border-2 border-yellow-500 bg-yellow-100 dark:bg-yellow-900/30"></div>
                        <span>Sell-through 25-50%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded border-2 border-red-500 bg-red-100 dark:bg-red-900/30"></div>
                        <span>Sell-through &lt; 25%</span>
                      </div>
                    </div>

                    {/* Heatmap Grid */}
                    <div className="overflow-x-auto">
                      <div className="inline-block min-w-full">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="border border-zinc-200 bg-zinc-50 p-2 text-left dark:border-zinc-800 dark:bg-zinc-900">
                                Size / Color
                              </th>
                              {heatmapData.colors.map((color) => (
                                <th
                                  key={color}
                                  className="border border-zinc-200 bg-zinc-50 p-2 text-center dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                  {color}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {heatmapData.sizes.map((size) => (
                              <tr key={size}>
                                <td className="border border-zinc-200 bg-zinc-50 p-2 font-medium dark:border-zinc-800 dark:bg-zinc-900">
                                  {size}
                                </td>
                                {heatmapData.colors.map((color) => {
                                  const cell = heatmapData.matrix[size]?.[color] || {
                                    stock: 0,
                                    sellThrough: 0,
                                  }
                                  return (
                                    <td
                                      key={`${size}-${color}`}
                                      className={`border border-zinc-200 p-3 text-center dark:border-zinc-800 ${getSellThroughColor(cell.sellThrough)}`}
                                    >
                                      <div className="font-medium">{cell.stock}</div>
                                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                        {formatPercent(cell.sellThrough)}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
