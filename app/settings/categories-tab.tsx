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
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-sans text-xl font-bold tracking-tight text-foreground mb-1">
          Product Categories
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Manage the categories used to organize your collection.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Add custom category (e.g. Vintage Silk)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory(newCategoryName)
              }}
              className="pl-10 bg-background border-border focus:border-[#E8400C] h-10 rounded-md text-sm"
            />
          </div>
          <Button
            onClick={() => handleAddCategory(newCategoryName)}
            disabled={isAdding || !newCategoryName.trim()}
            className="bg-[#E8400C] text-white hover:bg-[#c73508] rounded-md h-10 px-6 text-xs font-semibold tracking-[0.12em] uppercase shrink-0 transition-all border-none"
          >
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Category"}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Suggested Collections
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => handleAddCategory(name)}
                  disabled={isAdding}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border text-[0.65rem] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-all"
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
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-4">
          Active Categories ({categories.length})
        </p>
        
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((category) => (
              <div
                key={category.category_id}
                className="group flex items-center justify-between p-3 rounded-md bg-background border border-border hover:border-foreground/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[0.6rem] font-bold text-muted-foreground border border-border">
                    /
                  </div>
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(category.category_id, category.name)}
                  disabled={deletingId === category.category_id}
                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
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
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-md">
            <Tag className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No categories created yet.</p>
            <p className="text-[0.65rem] text-muted-foreground/60 mt-1 italic">Add categories to organize your product catalog.</p>
          </div>
        )}
      </div>
    </div>
  )
}
