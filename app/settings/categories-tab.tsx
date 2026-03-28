"use client"

import * as React from "react"
import { Plus, X, Tag, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type Category = {
  category_id: string
  name: string
}

type CategoriesTabProps = {
  initialCategories: Category[]
  accountId: string
}

const DEFAULT_SUGGESTIONS = [
  "Dresses",
  "Tops",
  "Bottoms",
  "Shoes",
  "Accessories",
  "Outerwear",
  "Knitwear",
  "Activewear",
  "Swimwear",
  "Jewelry",
]

export function CategoriesTab({ initialCategories, accountId }: CategoriesTabProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const [categories, setCategories] = React.useState<Category[]>(initialCategories)
  const [newCategoryName, setNewCategoryName] = React.useState("")
  const [isAdding, setIsAdding] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const handleAddCategory = async (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("Category already exists")
      return
    }

    setIsAdding(true)
    try {
      const newCategory = {
        category_id: uuidv4(),
        account_id: accountId,
        name: trimmedName,
      }

      const { error } = await supabase.from("categories").insert(newCategory)

      if (error) throw error

      setCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName("")
      toast.success(`Category "${trimmedName}" added`)
    } catch (error: any) {
      toast.error(error.message || "Failed to add category")
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from("categories").delete().eq("category_id", id)

      if (error) {
        if (error.code === "23503") {
          toast.error("Cannot delete category: It is currently linked to one or more products.")
        } else {
          throw error
        }
        return
      }

      setCategories((prev) => prev.filter((c) => c.category_id !== id))
      toast.success(`Category "${name}" removed`)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category")
    } finally {
      setDeletingId(null)
    }
  }

  const suggestions = DEFAULT_SUGGESTIONS.filter(
    (s) => !categories.some((c) => c.name.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Section */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-6">
        <h3 className="font-editorial text-xl font-bold text-zinc-50 mb-1">
          Product Categories
        </h3>
        <p className="text-sm text-zinc-500 mb-6">
          Manage the categories used to organize your collection.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Add custom category (e.g. Vintage Silk)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory(newCategoryName)
              }}
              className="pl-10 bg-zinc-950 border-zinc-800 focus:border-zinc-500 h-10 rounded-sm text-sm"
            />
          </div>
          <Button
            onClick={() => handleAddCategory(newCategoryName)}
            disabled={isAdding || !newCategoryName.trim()}
            className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-sm h-10 px-6 text-xs font-semibold tracking-[0.12em] uppercase shrink-0 transition-all"
          >
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Category"}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800/50">
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-3">
              Suggested Collections
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => handleAddCategory(name)}
                  disabled={isAdding}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-sm bg-zinc-800/50 border border-zinc-800 text-[0.65rem] font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all"
                >
                  <Plus className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-6">
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-4">
          Active Categories ({categories.length})
        </p>
        
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((category) => (
              <div
                key={category.category_id}
                className="group flex items-center justify-between p-3 rounded-sm bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-zinc-900 text-[0.6rem] font-bold text-zinc-500 border border-zinc-800">
                    /
                  </div>
                  <span className="text-sm font-medium text-zinc-200">{category.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(category.category_id, category.name)}
                  disabled={deletingId === category.category_id}
                  className="p-1 rounded-sm text-zinc-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  {deletingId === category.category_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-zinc-800 rounded-sm">
            <Tag className="h-8 w-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No categories created yet.</p>
            <p className="text-[0.65rem] text-zinc-600 mt-1 italic">Add categories to organize your product catalog.</p>
          </div>
        )}
      </div>
    </div>
  )
}
