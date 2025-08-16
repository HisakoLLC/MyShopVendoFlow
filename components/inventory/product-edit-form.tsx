"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"

export type ProductEditFormProps = {
  productId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProductEditForm({ productId, onSuccess, onCancel }: ProductEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!productId)
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    price: "",
    cost_price: "",
    quantity: "0",
    image_url: "",
  })
  const supabase = getSupabaseBrowserClient()
  const isEditing = !!productId

  useEffect(() => {
    if (productId) {
      fetchProduct(productId)
    }
  }, [productId])

  const fetchProduct = async (id: string) => {
    try {
      setInitialLoading(true)
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single()

      if (error) throw error

      if (data) {
        setFormData({
          name: data.name,
          sku: data.sku,
          description: data.description || "",
          category: data.category || "",
          price: data.price.toString(),
          cost_price: data.cost_price.toString(),
          quantity: data.quantity.toString(),
          image_url: data.image_url || "",
        })
      }
    } catch (error) {
      console.error("Error fetching product:", error)
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      })
    } finally {
      setInitialLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form
    if (!formData.name || !formData.sku || !formData.price || !formData.cost_price) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update({
            name: formData.name,
            sku: formData.sku,
            description: formData.description || null,
            category: formData.category || null,
            price: Number.parseFloat(formData.price),
            cost_price: Number.parseFloat(formData.cost_price),
            quantity: Number.parseInt(formData.quantity) || 0,
            image_url: formData.image_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId)

        if (error) throw error

        toast({
          title: "Product updated",
          description: `${formData.name} has been updated`,
        })
      } else {
        // Check if SKU already exists
        const { data: existingProduct, error: checkError } = await supabase
          .from("products")
          .select("id")
          .eq("sku", formData.sku)
          .maybeSingle()

        if (checkError) throw checkError

        if (existingProduct) {
          toast({
            title: "SKU already exists",
            description: "Please use a different SKU",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        // Create new product
        const { error } = await supabase.from("products").insert({
          name: formData.name,
          sku: formData.sku,
          description: formData.description || null,
          category: formData.category || null,
          price: Number.parseFloat(formData.price),
          cost_price: Number.parseFloat(formData.cost_price),
          quantity: Number.parseInt(formData.quantity) || 0,
          image_url: formData.image_url || null,
        })

        if (error) throw error

        toast({
          title: "Product created",
          description: `${formData.name} has been added to inventory`,
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/inventory")
        router.refresh()
      }
    } catch (error) {
      console.error("Error saving product:", error)
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} product. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Product" : "Add New Product"}</CardTitle>
          <CardDescription>
            {isEditing ? "Update the product details" : "Enter the details of the new product"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter product name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU/Barcode *</Label>
              <Input
                id="sku"
                name="sku"
                placeholder="Enter unique SKU or barcode"
                value={formData.sku}
                onChange={handleChange}
                required
                disabled={isEditing} // Don't allow SKU changes for existing products
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder="Enter product category"
                value={formData.category}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                name="image_url"
                placeholder="Enter image URL (optional)"
                value={formData.image_url}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter product description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Selling Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price *</Label>
              <Input
                id="cost_price"
                name="cost_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.cost_price}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                placeholder="0"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel || (() => router.push("/inventory"))}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Update Product" : "Save Product"}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
