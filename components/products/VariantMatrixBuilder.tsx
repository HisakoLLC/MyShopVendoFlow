"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, X } from "lucide-react"
import { toast, Toaster } from "sonner"

import { createProductVariants } from "@/app/products/actions"
import { VariantCellEditor } from "@/components/products/VariantCellEditor"
import { ProductCreatedInventoryModal, type BulkInventoryUpdate } from "@/components/products/ProductCreatedInventoryModal"

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
  const [inventoryModalState, setInventoryModalState] = React.useState<{
    open: boolean
    variantCount: number
    storeCount: number
    variants: { variant_id: string; size: string; color: string }[]
    stores: { store_id: string; name: string }[]
  }>({
    open: false,
    variantCount: 0,
    storeCount: 0,
    variants: [],
    stores: [],
  })

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

      const response = await createProductVariants(styleId, variants)

      const variantCount = response.variant_count ?? response.count ?? 0
      const storeCount = response.store_count ?? 0

      toast.success(
        response.message ??
          `${variantCount} variant${variantCount === 1 ? "" : "s"} created successfully!`
      )

      setInventoryModalState({
        open: storeCount > 0 && variantCount > 0,
        variantCount,
        storeCount,
        variants: (response.variant_ids ?? []).map((id: string, index: number) => {
          const v = variants[index]
          return {
            variant_id: id,
            size: v.size,
            color: v.color,
          }
        }),
        stores: (response.stores ?? []) as { store_id: string; name: string }[],
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create variants.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInventorySave = async (updates: BulkInventoryUpdate[]) => {
    if (updates.length === 0) return
    const res = await fetch("/api/inventory/bulk-set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? "Failed to save inventory.")
    }
  }

  const sizeArray = Array.from(selectedSizes).sort()
  const colorArray = Array.from(selectedColors).sort()

  // DS v3.0 chip classes
  const selectedChip = "bg-white text-zinc-950 rounded-sm px-3 py-1.5 text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer transition-colors"
  const unselectedChip = "border border-zinc-700 text-zinc-400 rounded-sm px-3 py-1.5 text-xs font-semibold tracking-[0.05em] uppercase hover:border-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer bg-transparent"

  const selectedToggle = "bg-white text-zinc-950 rounded-sm h-8 px-4 text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer transition-colors"
  const unselectedToggle = "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 rounded-sm h-8 px-4 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors cursor-pointer"

  const sublabelClass = "text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-3 block"

  // DS v3.0 input class
  const inputClass = "bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 placeholder:text-zinc-600 w-full max-w-xs"

  return (
    <>
      <Toaster richColors position="top-right" />

      <div className="space-y-4">
        {/* Size Selection */}
        <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-6">
          <h2 className="font-editorial text-xl font-bold text-zinc-50 mb-4">Size Selection</h2>

          <div className="space-y-4">
            <div>
              <p className={sublabelClass}>Choose Preset</p>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSizeMode("preset")}
                  className={sizeMode === "preset" ? selectedToggle : unselectedToggle}
                >
                  Preset
                </button>
                <button
                  type="button"
                  onClick={() => setSizeMode("custom")}
                  className={sizeMode === "custom" ? selectedToggle : unselectedToggle}
                >
                  Custom
                </button>
              </div>
            </div>

            {sizeMode === "preset" ? (
              <div>
                <p className={sublabelClass}>Select Preset Group</p>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className={inputClass}
                >
                  <option value="womens-standard">Women&apos;s Standard (XS/S/M/L/XL)</option>
                  <option value="mens-standard">Men&apos;s Standard (S/M/L/XL/XXL)</option>
                  <option value="numeric">Numeric (6/8/10/12/14)</option>
                </select>
              </div>
            ) : (
              <div>
                <p className={sublabelClass}>Custom Sizes (Comma-separated)</p>
                <input
                  placeholder="e.g., XS, S, M, L"
                  value={customSizes}
                  onChange={(e) => setCustomSizes(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-zinc-500">Comma-separated sizes</p>
              </div>
            )}

            {sizeArray.length > 0 && (
              <div>
                <p className={sublabelClass}>Selected Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {sizeArray.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSizeToggle(size)}
                      className={selectedSizes.has(size) ? selectedChip : unselectedChip}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Color Selection */}
        <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-6">
          <h2 className="font-editorial text-xl font-bold text-zinc-50 mb-4">Color Selection</h2>

          <div className="space-y-4">
            <div>
              <p className={sublabelClass}>Standard Colors</p>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => handleColorToggle(color.name)}
                    className={selectedColors.has(color.name) ? selectedChip : unselectedChip}
                  >
                    {color.name}
                  </button>
                ))}
              </div>
            </div>

            {showCustomColor ? (
              <div className="flex gap-2">
                <input
                  placeholder="Enter custom color name"
                  value={customColorInput}
                  onChange={(e) => setCustomColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCustomColor()
                    }
                  }}
                  className={inputClass}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomColor}
                  className="inline-flex h-9 items-center justify-center rounded-sm bg-white px-4 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-950 hover:bg-zinc-100 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomColor(false)
                    setCustomColorInput("")
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomColor(true)}
                className="inline-flex items-center gap-2 border border-zinc-700 text-zinc-400 rounded-sm px-3 py-1.5 text-xs font-semibold tracking-[0.05em] uppercase hover:border-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Color
              </button>
            )}

            {colorArray.length > 0 && (
              <div>
                <p className={sublabelClass}>Selected Colors</p>
                <div className="flex flex-wrap gap-2">
                  {colorArray.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorToggle(color)}
                      className={selectedColors.has(color) ? selectedChip : unselectedChip}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Variant Matrix Preview */}
        {sizeArray.length > 0 && colorArray.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="font-editorial text-xl font-bold text-zinc-50">
                Variant Preview
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {sizeArray.length} × {colorArray.length} = {sizeArray.length * colorArray.length} variants — click any cell to edit SKU, price, or cost
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3 text-left border-b border-r border-zinc-800">
                      Size
                    </th>
                    {colorArray.map((color) => (
                      <th
                        key={color}
                        className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-3 py-3 text-center border-b border-r border-zinc-800 last:border-r-0"
                      >
                        {color}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizeArray.map((size) => (
                    <tr key={size} className="border-b border-zinc-800 last:border-b-0">
                      <td className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3 border-r border-zinc-800">
                        {size}
                      </td>
                      {colorArray.map((color) => {
                        const key = `${size}-${color}`
                        const cell = variantCells.get(key)
                        if (!cell) return <td key={color} className="border-r border-zinc-800 last:border-r-0 p-3" />

                        return (
                          <td
                            key={color}
                            className="border-r border-zinc-800 last:border-r-0 p-3"
                          >
                            <button
                              type="button"
                              onClick={() => handleCellClick(cell)}
                              className="w-full border border-zinc-800 p-3 text-left transition-colors hover:bg-zinc-800/60 hover:border-zinc-700 rounded-sm"
                            >
                              <div className="font-mono text-xs text-zinc-300 font-semibold">
                                {cell.sku}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                KES {new Intl.NumberFormat("en-KE").format(cell.price)} · Cost {new Intl.NumberFormat("en-KE").format(cell.cost)}
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
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={selectedSizes.size === 0 || selectedColors.size === 0 || isSubmitting}
            className="inline-flex h-9 items-center justify-center rounded-sm bg-white px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-950 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Generating..." : `Generate ${variantCells.size} Variants`}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => router.push("/products")}
            className="inline-flex h-9 items-center justify-center rounded-sm border border-zinc-700 bg-transparent px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
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

      <ProductCreatedInventoryModal
        open={inventoryModalState.open}
        onClose={() => {
          setInventoryModalState((prev) => ({ ...prev, open: false }))
          router.push(`/products/${styleId}`)
          router.refresh()
        }}
        onSave={handleInventorySave}
        styleName={styleName}
        variants={inventoryModalState.variants}
        stores={inventoryModalState.stores}
      />
    </>
  )
}
