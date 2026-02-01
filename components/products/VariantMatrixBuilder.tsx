"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Plus } from "lucide-react"
import { toast, Toaster } from "sonner"

import { createProductVariants } from "@/app/products/actions"
import { VariantCellEditor } from "@/components/products/VariantCellEditor"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type VariantCell = {
  size: string
  color: string
  sku: string
  price: number
  cost: number
}

const SIZE_PRESETS = {
  "womens-standard": ["XS", "S", "M", "L", "XL"],
  "mens-standard": ["S", "M", "L", "XL", "XXL"],
  numeric: ["6", "8", "10", "12", "14"],
}

const PREDEFINED_COLORS = [
  { name: "White", code: "WHT" },
  { name: "Black", code: "BLK" },
  { name: "Navy", code: "NAV" },
  { name: "Beige", code: "BEI" },
  { name: "Olive", code: "OLV" },
  { name: "Burgundy", code: "BUR" },
  { name: "Coral", code: "COR" },
  { name: "Sage", code: "SAG" },
  { name: "Gray", code: "GRY" },
  { name: "Cream", code: "CRM" },
]

function generateStyleInitials(styleName: string): string {
  const words = styleName.trim().split(/\s+/)
  const initials = words
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
  return initials || "STL"
}

function getColorCode(colorName: string): string {
  const predefined = PREDEFINED_COLORS.find((c) => c.name.toLowerCase() === colorName.toLowerCase())
  if (predefined) return predefined.code

  // Generate code from custom color name (first 3 letters, uppercase)
  return colorName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X")
}

function generateSKU(styleInitials: string, size: string, colorCode: string): string {
  return `${styleInitials}-${size.toUpperCase()}-${colorCode}`
}

type VariantMatrixBuilderProps = {
  styleId: string
  styleName: string
  basePrice: number
  baseCost: number
}

export function VariantMatrixBuilder({
  styleId,
  styleName,
  basePrice,
  baseCost,
}: VariantMatrixBuilderProps) {
  const router = useRouter()
  const styleInitials = React.useMemo(() => generateStyleInitials(styleName), [styleName])

  const [sizeMode, setSizeMode] = React.useState<"preset" | "custom">("preset")
  const [selectedPreset, setSelectedPreset] = React.useState<string>("womens-standard")
  const [customSizes, setCustomSizes] = React.useState<string>("")
  const [selectedSizes, setSelectedSizes] = React.useState<Set<string>>(new Set())
  const [selectedColors, setSelectedColors] = React.useState<Set<string>>(new Set())
  const [customColorInput, setCustomColorInput] = React.useState("")
  const [showCustomColor, setShowCustomColor] = React.useState(false)
  const [editingCellKey, setEditingCellKey] = React.useState<string | null>(null)
  const [variantCells, setVariantCells] = React.useState<Map<string, VariantCell>>(new Map())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Update selected sizes when preset or custom changes
  React.useEffect(() => {
    if (sizeMode === "preset") {
      const sizes = SIZE_PRESETS[selectedPreset as keyof typeof SIZE_PRESETS] || []
      setSelectedSizes(new Set(sizes))
    } else {
      const sizes = customSizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      setSelectedSizes(new Set(sizes))
    }
  }, [sizeMode, selectedPreset, customSizes])

  // Generate variant cells when sizes/colors change
  React.useEffect(() => {
    const newCells = new Map<string, VariantCell>()

    selectedSizes.forEach((size) => {
      selectedColors.forEach((color) => {
        const key = `${size}-${color}`
        const existing = variantCells.get(key)

        if (existing) {
          newCells.set(key, existing)
        } else {
          const colorCode = getColorCode(color)
          const sku = generateSKU(styleInitials, size, colorCode)
          newCells.set(key, {
            size,
            color,
            sku,
            price: basePrice,
            cost: baseCost,
          })
        }
      })
    })

    setVariantCells(newCells)
  }, [selectedSizes, selectedColors, styleInitials, basePrice, baseCost])

  const handleSizeToggle = (size: string) => {
    const newSet = new Set(selectedSizes)
    if (newSet.has(size)) {
      newSet.delete(size)
    } else {
      newSet.add(size)
    }
    setSelectedSizes(newSet)
  }

  const handleColorToggle = (color: string) => {
    const newSet = new Set(selectedColors)
    if (newSet.has(color)) {
      newSet.delete(color)
    } else {
      newSet.add(color)
    }
    setSelectedColors(newSet)
  }

  const handleAddCustomColor = () => {
    if (customColorInput.trim()) {
      handleColorToggle(customColorInput.trim())
      setCustomColorInput("")
      setShowCustomColor(false)
    }
  }

  const handleCellClick = (cell: VariantCell) => {
    const key = `${cell.size}-${cell.color}`
    setEditingCellKey(key)
  }

  const handleCellSave = (data: { sku: string; price: number; cost: number }) => {
    if (!editingCellKey) return

    setVariantCells((prev) => {
      const next = new Map(prev)
      const existing = next.get(editingCellKey)
      if (existing) {
        next.set(editingCellKey, {
          ...existing,
          sku: data.sku,
          price: data.price,
          cost: data.cost,
        })
      }
      return next
    })
    setEditingCellKey(null)
  }

  const handleCellCancel = () => {
    setEditingCellKey(null)
  }

  const handleGenerate = async () => {
    if (selectedSizes.size === 0 || selectedColors.size === 0) {
      toast.error("Please select at least one size and one color.")
      return
    }

    setIsSubmitting(true)
    try {
      const variants = Array.from(variantCells.values()).map((cell) => ({
        style_id: styleId,
        size: cell.size,
        color: cell.color,
        sku: cell.sku.trim(),
        price: cell.price,
        cost: cell.cost,
      }))

      const { count } = await createProductVariants(styleId, variants)

      toast.success(`${count} variant${count === 1 ? "" : "s"} created successfully!`)
      router.push("/products")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create variants.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const sizeArray = Array.from(selectedSizes).sort()
  const colorArray = Array.from(selectedColors).sort()

  return (
    <>
      <Toaster richColors position="top-right" />

      <div className="space-y-6">
        {/* Size Selection */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Size Selection
          </h2>

          <RadioGroup value={sizeMode} onValueChange={(v) => setSizeMode(v as "preset" | "custom")}>
            <div className="mb-4 flex items-center space-x-2">
              <RadioGroupItem value="preset" id="preset" />
              <Label htmlFor="preset">Use Preset</Label>
            </div>
            {sizeMode === "preset" && (
              <div className="mb-4 ml-6">
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="womens-standard">Women's Standard (XS/S/M/L/XL)</SelectItem>
                    <SelectItem value="mens-standard">Men's Standard (S/M/L/XL/XXL)</SelectItem>
                    <SelectItem value="numeric">Numeric (6/8/10/12/14)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mb-4 flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Custom Sizes</Label>
            </div>
            {sizeMode === "custom" && (
              <div className="mb-4 ml-6">
                <Input
                  placeholder="e.g., XS, S, M, L"
                  value={customSizes}
                  onChange={(e) => setCustomSizes(e.target.value)}
                  className="max-w-xs"
                />
                <p className="mt-1 text-xs text-zinc-500">Comma-separated sizes</p>
              </div>
            )}
          </RadioGroup>

          {sizeArray.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sizeArray.map((size) => (
                <div
                  key={size}
                  className="flex items-center space-x-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Checkbox
                    checked={selectedSizes.has(size)}
                    onCheckedChange={() => handleSizeToggle(size)}
                  />
                  <Label className="cursor-pointer">{size}</Label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Color Selection */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Color Selection
          </h2>

          <div className="mb-4 flex flex-wrap gap-2">
            {PREDEFINED_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => handleColorToggle(color.name)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  selectedColors.has(color.name)
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                {selectedColors.has(color.name) && <Check className="h-4 w-4" />}
                {color.name}
              </button>
            ))}
          </div>

          {showCustomColor ? (
            <div className="flex gap-2">
              <Input
                placeholder="Enter custom color name"
                value={customColorInput}
                onChange={(e) => setCustomColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddCustomColor()
                  }
                }}
                className="max-w-xs"
                autoFocus
              />
              <Button type="button" onClick={handleAddCustomColor} size="sm">
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomColor(false)
                  setCustomColorInput("")
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomColor(true)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <Plus className="h-4 w-4" />
              Add Custom Color
            </button>
          )}

          {colorArray.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {colorArray.map((color) => (
                <div
                  key={color}
                  className="flex items-center space-x-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Checkbox
                    checked={selectedColors.has(color)}
                    onCheckedChange={() => handleColorToggle(color)}
                  />
                  <Label className="cursor-pointer">{color}</Label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variant Matrix Preview */}
        {sizeArray.length > 0 && colorArray.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Variant Preview ({sizeArray.length} × {colorArray.length} ={" "}
              {sizeArray.length * colorArray.length} variants)
            </h2>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-left text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                        Size
                      </th>
                      {colorArray.map((color) => (
                        <th
                          key={color}
                          className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-center text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          {color}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeArray.map((size) => (
                      <tr key={size}>
                        <td className="border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                          {size}
                        </td>
                        {colorArray.map((color) => {
                          const key = `${size}-${color}`
                          const cell = variantCells.get(key)
                          if (!cell) return <td key={color} className="border border-zinc-200 px-4 py-2" />

                          return (
                            <td
                              key={color}
                              className="border border-zinc-200 px-4 py-2 text-center dark:border-zinc-800"
                            >
                              <button
                                type="button"
                                onClick={() => handleCellClick(cell)}
                                className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                              >
                                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                  SKU: {cell.sku}
                                </div>
                                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                  Price: KES {new Intl.NumberFormat("en-KE").format(cell.price)}
                                </div>
                                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                  Cost: KES {new Intl.NumberFormat("en-KE").format(cell.cost)}
                                </div>
                              </button>
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

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={selectedSizes.size === 0 || selectedColors.size === 0 || isSubmitting}
          >
            {isSubmitting ? "Generating..." : `Generate ${variantCells.size} Variants`}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => router.push("/products")}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Edit Cell Dialog */}
      {editingCellKey && variantCells.has(editingCellKey) && (
        <VariantCellEditor
          open={!!editingCellKey}
          size={variantCells.get(editingCellKey)!.size}
          color={variantCells.get(editingCellKey)!.color}
          defaultSku={variantCells.get(editingCellKey)!.sku}
          defaultPrice={variantCells.get(editingCellKey)!.price}
          defaultCost={variantCells.get(editingCellKey)!.cost}
          onSave={handleCellSave}
          onCancel={handleCellCancel}
        />
      )}
    </>
  )
}
