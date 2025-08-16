"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Trash2, Plus, Loader2, Save } from "lucide-react"

export type PurchaseEditFormProps = {
  purchaseId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function PurchaseEditForm({ purchaseId, onSuccess, onCancel }: PurchaseEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!purchaseId)
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [purchaseItems, setPurchaseItems] = useState([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState("")
  const [formData, setFormData] = useState({
    supplier_id: "",
    reference_number: "",
    notes: "",
  })
  const supabase = getSupabaseBrowserClient()
  const isEditing = !!purchaseId

  useEffect(() => {
    fetchSuppliers()
    fetchProducts()
    if (purchaseId) {
      fetchPurchase(purchaseId)
    }
  }, [purchaseId])

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from("suppliers").select("id, name").order("name")

      if (error) {
        throw error
      }

      setSuppliers(data || [])
    } catch (error) {
      console.error("Error fetching suppliers:", error)
      toast({
        title: "Error",
        description: "Failed to load suppliers",
        variant: "destructive",
      })
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("id, name, sku, cost_price").order("name")

      if (error) {
        throw error
      }

      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    }
  }

  const fetchPurchase = async (id: string) => {
    try {
      setInitialLoading(true)

      // Fetch purchase details
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .select("*")
        .eq("id", id)
        .single()

      if (purchaseError) throw purchaseError

      // Fetch purchase items
      const { data: items, error: itemsError } = await supabase
        .from("purchase_items")
        .select(`
          id,
          product_id,
          quantity,
          unit_cost,
          total_cost,
          products (
            id,
            name,
            sku
          )
        `)
        .eq("purchase_id", id)

      if (itemsError) throw itemsError

      if (purchase) {
        setFormData({
          supplier_id: purchase.supplier_id || "",
          reference_number: purchase.reference_number,
          notes: purchase.notes || "",
        })
      }

      if (items) {
        const purchaseItems = items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          name: item.products?.name || "Unknown Product",
          sku: item.products?.sku || "",
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost,
        }))
        setPurchaseItems(purchaseItems)
      }
    } catch (error) {
      console.error("Error fetching purchase:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase details",
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

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const addItem = () => {
    if (!selectedProduct || quantity < 1 || !unitCost) {
      toast({
        title: "Missing information",
        description: "Please select a product, quantity, and unit cost",
        variant: "destructive",
      })
      return
    }

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    const totalCost = Number.parseFloat(unitCost) * quantity

    setPurchaseItems([
      ...purchaseItems,
      {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        quantity,
        unit_cost: Number.parseFloat(unitCost),
        total_cost: totalCost,
      },
    ])

    // Reset form
    setSelectedProduct("")
    setQuantity(1)
    setUnitCost("")
  }

  const removeItem = (index) => {
    const updatedItems = [...purchaseItems]
    updatedItems.splice(index, 1)
    setPurchaseItems(updatedItems)
  }

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + item.total_cost, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.supplier_id) {
      toast({
        title: "Supplier required",
        description: "Please select a supplier",
        variant: "destructive",
      })
      return
    }

    if (!formData.reference_number) {
      toast({
        title: "Reference number required",
        description: "Please enter a reference number",
        variant: "destructive",
      })
      return
    }

    if (purchaseItems.length === 0) {
      toast({
        title: "No items added",
        description: "Please add at least one product to the purchase",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        // Update existing purchase
        const { error: purchaseError } = await supabase
          .from("purchases")
          .update({
            supplier_id: formData.supplier_id,
            reference_number: formData.reference_number,
            total_amount: calculateTotal(),
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", purchaseId)

        if (purchaseError) throw purchaseError

        // Get existing purchase items to compare with current items
        const { data: existingItems, error: itemsError } = await supabase
          .from("purchase_items")
          .select("id, product_id, quantity")
          .eq("purchase_id", purchaseId)

        if (itemsError) throw itemsError

        // Process each item in the purchase
        for (const item of purchaseItems) {
          const existingItem = existingItems?.find((ei) => ei.product_id === item.product_id)

          if (existingItem) {
            // Update existing item
            const quantityDiff = item.quantity - existingItem.quantity

            // Update purchase item
            const { error: updateItemError } = await supabase
              .from("purchase_items")
              .update({
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                total_cost: item.total_cost,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingItem.id)

            if (updateItemError) throw updateItemError

            // Update product quantity if it changed
            if (quantityDiff !== 0) {
              const { data: product, error: productError } = await supabase
                .from("products")
                .select("quantity")
                .eq("id", item.product_id)
                .single()

              if (productError) throw productError

              const { error: updateProductError } = await supabase
                .from("products")
                .update({
                  quantity: product.quantity + quantityDiff,
                  cost_price: item.unit_cost, // Update cost price
                  updated_at: new Date().toISOString(),
                })
                .eq("id", item.product_id)

              if (updateProductError) throw updateProductError
            }
          } else {
            // Add new item
            const { error: newItemError } = await supabase.from("purchase_items").insert({
              purchase_id: purchaseId,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              total_cost: item.total_cost,
            })

            if (newItemError) throw newItemError

            // Update product quantity
            const { data: product, error: productError } = await supabase
              .from("products")
              .select("quantity")
              .eq("id", item.product_id)
              .single()

            if (productError) throw productError

            const { error: updateProductError } = await supabase
              .from("products")
              .update({
                quantity: product.quantity + item.quantity,
                cost_price: item.unit_cost, // Update cost price
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.product_id)

            if (updateProductError) throw updateProductError
          }
        }

        // Handle deleted items (items that were in the original purchase but not in the current list)
        for (const existingItem of existingItems || []) {
          const stillExists = purchaseItems.some((item) => item.product_id === existingItem.product_id)

          if (!stillExists) {
            // Delete the item
            const { error: deleteItemError } = await supabase.from("purchase_items").delete().eq("id", existingItem.id)

            if (deleteItemError) throw deleteItemError

            // Decrease quantity from product
            const { data: product, error: productError } = await supabase
              .from("products")
              .select("quantity")
              .eq("id", existingItem.product_id)
              .single()

            if (productError) throw productError

            const { error: updateProductError } = await supabase
              .from("products")
              .update({
                quantity: product.quantity - existingItem.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingItem.product_id)

            if (updateProductError) throw updateProductError
          }
        }

        toast({
          title: "Purchase updated",
          description: `Purchase #${formData.reference_number} has been updated`,
        })
      } else {
        // Create new purchase
        const { data: purchase, error: purchaseError } = await supabase
          .from("purchases")
          .insert({
            supplier_id: formData.supplier_id,
            reference_number: formData.reference_number,
            total_amount: calculateTotal(),
            notes: formData.notes || null,
          })
          .select()
          .single()

        if (purchaseError) throw purchaseError

        // Add purchase items and update inventory
        for (const item of purchaseItems) {
          // Add purchase item
          const { error: itemError } = await supabase.from("purchase_items").insert({
            purchase_id: purchase.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost,
          })

          if (itemError) throw itemError

          // Get current product quantity
          const { data: productData, error: productError } = await supabase
            .from("products")
            .select("quantity")
            .eq("id", item.product_id)
            .single()

          if (productError) throw productError

          // Update product quantity and cost price
          const { error: updateError } = await supabase
            .from("products")
            .update({
              quantity: productData.quantity + item.quantity,
              cost_price: item.unit_cost,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.product_id)

          if (updateError) throw updateError
        }

        toast({
          title: "Purchase recorded",
          description: `Purchase #${formData.reference_number} has been recorded`,
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/purchases")
        router.refresh()
      }
    } catch (error) {
      console.error("Error saving purchase:", error)
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "record"} purchase. Please try again.`,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Purchase Items</CardTitle>
            <CardDescription>Add products to this purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product">Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (SKU: {product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit-cost">Unit Cost</Label>
                <Input
                  id="unit-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
            </div>

            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>

            {purchaseItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.unit_cost.toFixed(2)}</TableCell>
                      <TableCell>${item.total_cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 border rounded-lg">
                <p className="text-muted-foreground">No items added</p>
                <p className="text-sm text-muted-foreground mt-1">Add products to this purchase</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
            <CardDescription>Enter supplier and reference information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={formData.supplier_id} onValueChange={(value) => handleSelectChange("supplier_id", value)}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number *</Label>
              <Input
                id="reference_number"
                name="reference_number"
                placeholder="Enter invoice or reference #"
                value={formData.reference_number}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add notes about this purchase"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading || purchaseItems.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Processing..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Purchase" : "Save Purchase"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onCancel || (() => router.push("/purchases"))}
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}
