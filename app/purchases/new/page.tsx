"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"

export default function NewPurchasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    reference_number: "",
    purchase_date: new Date().toISOString().split("T")[0],
    supplier_name: "",
    notes: "",
  })
  const [items, setItems] = useState([
    {
      id: uuidv4(),
      product_id: "",
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
    },
  ])
  const [products, setProducts] = useState([])
  const [referenceError, setReferenceError] = useState("")

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from("products").select("id, name, sku, cost_price")
      if (error) {
        console.error("Error fetching products:", error)
        return
      }
      setProducts(data || [])
    }

    fetchProducts()
  }, [])

  // Check if reference number already exists
  const checkReferenceNumber = async (reference) => {
    if (!reference) return false

    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("purchases")
      .select("id")
      .eq("reference_number", reference)
      .maybeSingle()

    if (error) {
      console.error("Error checking reference number:", error)
      return false
    }

    return !!data
  }

  const handleInputChange = async (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Check reference number uniqueness when it changes
    if (name === "reference_number" && value) {
      setReferenceError("")
      const exists = await checkReferenceNumber(value)
      if (exists) {
        setReferenceError("This reference number already exists. Please use a different one.")
      }
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value

    // If product_id or quantity or unit_cost changes, update total_cost
    if (field === "product_id" || field === "quantity" || field === "unit_cost") {
      const quantity = field === "quantity" ? value : newItems[index].quantity
      const unitCost = field === "unit_cost" ? value : newItems[index].unit_cost

      // If product_id changes, set the default unit_cost from the product
      if (field === "product_id") {
        const selectedProduct = products.find((p) => p.id === value)
        if (selectedProduct) {
          newItems[index].unit_cost = selectedProduct.cost_price || 0
        }
      }

      newItems[index].total_cost = quantity * (field === "unit_cost" ? value : newItems[index].unit_cost)
    }

    setItems(newItems)
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        id: uuidv4(),
        product_id: "",
        quantity: 1,
        unit_cost: 0,
        total_cost: 0,
      },
    ])
  }

  const removeItem = (index) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_cost, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Check for reference number error
    if (referenceError) {
      toast({
        title: "Error",
        description: referenceError,
        variant: "destructive",
      })
      return
    }

    // Double-check reference number uniqueness
    const exists = await checkReferenceNumber(formData.reference_number)
    if (exists) {
      setReferenceError("This reference number already exists. Please use a different one.")
      toast({
        title: "Error",
        description: "This reference number already exists. Please use a different one.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const purchaseId = uuidv4()
      const totalAmount = calculateTotal()

      // First, check if we need to create a new supplier
      let supplier_id = null
      if (formData.supplier_name) {
        // Check if supplier already exists
        const { data: existingSupplier, error: supplierQueryError } = await supabase
          .from("suppliers")
          .select("id")
          .eq("name", formData.supplier_name)
          .maybeSingle()

        if (supplierQueryError) {
          console.error("Error checking supplier:", supplierQueryError)
        }

        if (existingSupplier) {
          supplier_id = existingSupplier.id
        } else {
          // Create new supplier
          const { data: newSupplier, error: supplierError } = await supabase
            .from("suppliers")
            .insert({
              name: formData.supplier_name,
            })
            .select()
            .single()

          if (supplierError) {
            console.error("Error creating supplier:", supplierError)
          } else {
            supplier_id = newSupplier.id
          }
        }
      }

      // Create purchase record
      const { error: purchaseError } = await supabase.from("purchases").insert({
        id: purchaseId,
        reference_number: formData.reference_number,
        purchase_date: formData.purchase_date,
        supplier_id: supplier_id,
        notes: formData.notes || null,
        total_amount: totalAmount,
      })

      if (purchaseError) {
        throw purchaseError
      }

      // Create purchase items and update product quantities
      for (const item of items) {
        if (!item.product_id || item.quantity <= 0) continue

        // Insert purchase item
        const { error: itemError } = await supabase.from("purchase_items").insert({
          purchase_id: purchaseId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost,
        })

        if (itemError) {
          throw itemError
        }

        // Update product quantity
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", item.product_id)
          .single()

        if (productError) {
          throw productError
        }

        const { error: updateError } = await supabase
          .from("products")
          .update({
            quantity: product.quantity + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.product_id)

        if (updateError) {
          throw updateError
        }
      }

      toast({
        title: "Purchase created",
        description: "The purchase has been successfully created",
      })

      router.push("/purchases")
    } catch (error) {
      console.error("Error creating purchase:", error)
      toast({
        title: "Error",
        description: `Failed to create purchase: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col space-y-6 p-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/purchases")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Purchases
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Purchase</CardTitle>
          <CardDescription>Enter purchase details and add items</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="reference_number" className="text-sm font-medium">
                  Reference Number
                </label>
                <input
                  id="reference_number"
                  name="reference_number"
                  type="text"
                  required
                  value={formData.reference_number}
                  onChange={handleInputChange}
                  className={`w-full rounded-md border ${
                    referenceError ? "border-red-500" : "border-input"
                  } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                  placeholder="PO-12345"
                />
                {referenceError && <p className="text-sm text-red-500 mt-1">{referenceError}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="purchase_date" className="text-sm font-medium">
                  Purchase Date
                </label>
                <input
                  id="purchase_date"
                  name="purchase_date"
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="supplier_name" className="text-sm font-medium">
                  Supplier
                </label>
                <input
                  id="supplier_name"
                  name="supplier_name"
                  type="text"
                  value={formData.supplier_name}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Enter supplier name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </label>
                <input
                  id="notes"
                  name="notes"
                  type="text"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Purchase Items</h3>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  Add Item
                </Button>
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-2 items-center font-medium text-sm mb-2">
                <div className="col-span-4">Product</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Unit Cost (KES)</div>
                <div className="col-span-2">Total (KES)</div>
                <div className="col-span-2"></div>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)}
                        min="1"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Qty"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.unit_cost}
                        onChange={(e) => handleItemChange(index, "unit_cost", Number.parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Unit Cost"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.total_cost}
                        readOnly
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-muted"
                        placeholder="Total"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        variant="ghost"
                        size="sm"
                        disabled={items.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">KES {calculateTotal().toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.push("/purchases")}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || items.some((item) => !item.product_id) || !!referenceError}>
                {loading ? "Creating..." : "Create Purchase"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
