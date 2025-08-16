"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Trash2, Plus, Loader2, Save, Search, X, Edit, CreditCard, FileText, Printer } from "lucide-react"
import { generateReceipt } from "@/lib/receipt-generator"
import { formatCurrency } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createSale, updateSale, generateReceiptNumber, getProductsWithStock } from "@/lib/actions/sales-actions"
import { Checkbox } from "@/components/ui/checkbox"

export type SaleEditFormProps = {
  saleId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

// Hardcoded store info
const storeInfo = {
  name: "AQSS Flow Limited",
  address: "Eastleigh, Nairobi",
  phone: "Phone: +254799964646",
  email: "Email: aqssflow@gmail.com",
}

export function SaleEditForm({ saleId, onSuccess, onCancel }: SaleEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredProducts, setFilteredProducts] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [skipReceiptGeneration, setSkipReceiptGeneration] = useState(false)
  const [receiptGenerating, setReceiptGenerating] = useState(false)
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const [formData, setFormData] = useState({
    receipt_number: "",
    payment_method: "Cash",
    payment_reference: "",
    notes: "",
    sale_date: new Date().toISOString(),
    customer_name: "",
    payment_status: "Paid", // Default to Paid
    amount_paid: 0, // Will be set to total by default
    amount_due: 0, // Will be calculated but not stored in DB
  })
  const isEditing = !!saleId

  useEffect(() => {
    async function initialize() {
      await fetchProducts()
      if (saleId) {
        setInitialLoading(true) // Only set loading when we have a saleId
        await fetchSale(saleId)
      }
    }

    initialize()
  }, [saleId])

  // Update amount_paid and amount_due when payment_status changes or total changes
  useEffect(() => {
    const total = calculateTotal()

    if (formData.payment_status === "Paid") {
      setFormData((prev) => ({
        ...prev,
        amount_paid: total,
        amount_due: 0,
      }))
    } else if (formData.payment_status === "Unpaid") {
      setFormData((prev) => ({
        ...prev,
        amount_paid: 0,
        amount_due: total,
      }))
    }
    // For Partial, we let the user input the amount_paid
  }, [formData.payment_status, cartItems])

  useEffect(() => {
    // Filter products based on search query
    if (searchQuery.trim() === "") {
      setFilteredProducts([])
    } else {
      const query = searchQuery.toLowerCase()

      // Check for exact SKU match first (for barcode scanning)
      const exactSkuMatch = products.find((p) => p.sku === searchQuery.trim())

      if (exactSkuMatch) {
        // If we have an exact SKU match, only show that product
        setFilteredProducts([exactSkuMatch])
      } else {
        // Otherwise filter by name, SKU, or category
        const matches = products.filter(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            product.sku.toLowerCase().includes(query) ||
            (product.category && product.category.toLowerCase().includes(query)),
        )
        setFilteredProducts(matches.slice(0, 5)) // Limit to 5 suggestions
      }
    }
  }, [searchQuery, products])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const fetchProducts = async () => {
    try {
      const result = await getProductsWithStock()

      if (result.success) {
        setProducts(result.products || [])
      } else {
        throw new Error(result.error || "Failed to load products")
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    }
  }

  const fetchSale = async (id: string) => {
    try {
      if (!id) {
        console.log("No sale ID provided, skipping fetch")
        setInitialLoading(false)
        return
      }

      // Use the API route instead of direct Supabase query
      const response = await fetch(`/api/sales/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      // Check if response is ok
      if (!response.ok) {
        // Try to parse error as JSON, but handle text responses too
        let errorMessage = "Failed to fetch sale details"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If JSON parsing fails, try to get text content
          try {
            const textError = await response.text()
            errorMessage = textError || errorMessage
          } catch (textError) {
            // If text extraction fails, use default message
          }
        }
        throw new Error(errorMessage)
      }

      // Parse the JSON response
      let responseData
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        throw new Error("Invalid response format from server")
      }

      const { sale, items } = responseData

      if (sale) {
        // Calculate amount_due if it's not in the database
        const amountDue =
          sale.amount_due !== undefined ? sale.amount_due : Math.max(0, sale.total_amount - (sale.amount_paid || 0))

        setFormData({
          receipt_number: sale.receipt_number,
          payment_method: sale.payment_method,
          payment_reference: sale.payment_reference || "",
          notes: sale.notes || "",
          sale_date: sale.sale_date,
          customer_name: sale.customer_name || "",
          payment_status: sale.payment_status || "Paid",
          amount_paid: sale.amount_paid || sale.total_amount,
          amount_due: amountDue,
        })
      }

      if (items) {
        const cartItems = items.map((item) => ({
          id: item.product_id,
          name: item.products.name,
          sku: item.products.sku,
          price: item.unit_price,
          quantity: item.quantity,
          total: item.total_price,
          max_quantity: item.products.quantity + item.quantity, // Current stock + what was sold
        }))
        setCartItems(cartItems)
      }
    } catch (error) {
      console.error("Error fetching sale:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load sale details",
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

  const handleAmountPaidChange = (e) => {
    const amountPaid = Number.parseFloat(e.target.value) || 0
    const total = calculateTotal()
    const amountDue = Math.max(0, total - amountPaid)

    setFormData((prev) => ({
      ...prev,
      amount_paid: amountPaid,
      amount_due: amountDue,
      // Update payment status based on the amount paid
      payment_status: amountPaid >= total ? "Paid" : amountPaid > 0 ? "Partial" : "Unpaid",
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBarcodeSubmit = (e) => {
    if (e) e.preventDefault()

    if (!searchQuery.trim()) return

    const product = products.find((p) => p.sku === searchQuery.trim())

    if (!product) {
      toast({
        title: "Product not found",
        description: `No product found with SKU/Barcode: ${searchQuery}`,
        variant: "destructive",
      })
      return
    }

    addProductToCart(product)
    setSearchQuery("")
  }

  const handleProductSelect = (product) => {
    addProductToCart(product)
    setSearchQuery("")
    setShowSuggestions(false)
  }

  const addProductToCart = (product) => {
    if (product.quantity <= 0) {
      toast({
        title: "Out of stock",
        description: `${product.name} is out of stock`,
        variant: "destructive",
      })
      return
    }

    // Check if product already in cart
    const existingItemIndex = cartItems.findIndex((item) => item.id === product.id)

    if (existingItemIndex >= 0) {
      // Update quantity if already in cart
      const updatedItems = [...cartItems]
      const item = updatedItems[existingItemIndex]

      if (item.quantity >= product.quantity) {
        toast({
          title: "Maximum reached",
          description: `Only ${product.quantity} units available in stock`,
          variant: "destructive",
        })
        return
      }

      item.quantity += 1
      item.total = item.quantity * item.price
      setCartItems(updatedItems)
    } else {
      // Add new item to cart
      setCartItems([
        ...cartItems,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
          total: product.price,
          max_quantity: product.quantity,
        },
      ])
    }
  }

  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return

    const updatedItems = [...cartItems]
    const item = updatedItems[index]

    if (newQuantity > item.max_quantity) {
      toast({
        title: "Maximum reached",
        description: `Only ${item.max_quantity} units available in stock`,
        variant: "destructive",
      })
      return
    }

    item.quantity = newQuantity
    item.total = item.quantity * item.price
    setCartItems(updatedItems)
  }

  const updateItemPrice = (index, newPrice) => {
    // Convert to number and validate
    const price = Number.parseFloat(newPrice)

    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Price must be a positive number",
        variant: "destructive",
      })
      return
    }

    const updatedItems = [...cartItems]
    const item = updatedItems[index]

    item.price = price
    item.total = item.quantity * price

    setCartItems(updatedItems)
  }

  const removeItem = (index) => {
    const updatedItems = [...cartItems]
    updatedItems.splice(index, 1)
    setCartItems(updatedItems)
  }

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.total, 0)
  }

  const generateAndDownloadReceipt = async (receiptNumber, totalAmount, amountPaid, amountDue) => {
    setReceiptGenerating(true)
    try {
      // Generate receipt PDF with store info
      const receiptBlob = await generateReceipt({
        receiptNumber,
        date: new Date(),
        items: cartItems,
        total: totalAmount,
        paymentMethod: formData.payment_method,
        paymentReference: formData.payment_reference,
        customerName: formData.customer_name,
        storeInfo: storeInfo,
        paymentStatus: formData.payment_status,
        amountPaid: amountPaid,
        amountDue: amountDue,
      })

      // Create download link
      const url = URL.createObjectURL(receiptBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Receipt-${receiptNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      return true
    } catch (error) {
      console.error("Error generating receipt:", error)
      toast({
        title: "Receipt Generation Failed",
        description: "We couldn't generate the receipt PDF. Please try printing it later.",
        variant: "warning",
      })
      return false
    } finally {
      setReceiptGenerating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (cartItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add at least one product to the cart",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const totalAmount = calculateTotal()
      let receiptNumber = formData.receipt_number
      let currentSaleId = saleId

      // Ensure amount_paid is correctly set
      let amountPaid = formData.amount_paid

      // For Paid sales, ensure amount_paid equals total
      if (formData.payment_status === "Paid") {
        amountPaid = totalAmount
      }
      // For Unpaid sales, ensure amount_paid is 0
      else if (formData.payment_status === "Unpaid") {
        amountPaid = 0
      }
      // For Partial, use the user-entered amount_paid

      // Calculate amount_due for the receipt (not stored in DB)
      const amountDue = Math.max(0, totalAmount - amountPaid)

      if (isEditing) {
        // Update existing sale using server action
        const result = await updateSale(
          currentSaleId,
          {
            receipt_number: formData.receipt_number,
            total_amount: totalAmount,
            payment_method: formData.payment_method,
            payment_reference: formData.payment_reference || null,
            notes: formData.notes || null,
            customer_name: formData.customer_name || null,
            payment_status: formData.payment_status,
            amount_paid: amountPaid,
          },
          cartItems,
        )

        if (!result.success) {
          throw new Error(result.error || "Failed to update sale")
        }

        receiptNumber = result.receiptNumber

        // Only generate receipt if not skipped
        if (!skipReceiptGeneration) {
          await generateAndDownloadReceipt(receiptNumber, totalAmount, amountPaid, amountDue)
        }

        toast({
          title: "Sale updated",
          description: `Receipt #${receiptNumber} has been updated${skipReceiptGeneration ? "" : " and downloaded"}`,
        })
      } else {
        // For new sales, get a receipt number but don't create the sale yet
        try {
          receiptNumber = await generateReceiptNumber()
        } catch (error) {
          throw new Error(`Failed to generate receipt number: ${error.message}`)
        }

        // Only create the sale and generate receipt when the user clicks "Complete Sale"
        const result = await createSale(
          {
            receipt_number: receiptNumber,
            total_amount: totalAmount,
            payment_method: formData.payment_method,
            payment_reference: formData.payment_reference || null,
            notes: formData.notes || null,
            customer_name: formData.customer_name || null,
            payment_status: formData.payment_status,
            amount_paid: amountPaid,
          },
          cartItems,
        )

        if (!result.success) {
          throw new Error(result.error || "Failed to create sale")
        }

        currentSaleId = result.saleId

        // Only generate receipt if not skipped
        if (!skipReceiptGeneration) {
          await generateAndDownloadReceipt(receiptNumber, totalAmount, amountPaid, amountDue)
        }

        toast({
          title: "Sale completed",
          description: `Receipt #${receiptNumber} has been created${skipReceiptGeneration ? "" : " and downloaded"}`,
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        // Redirect to sales list
        router.push("/sales")
        router.refresh()
      }
    } catch (error) {
      console.error("Error saving sale:", error)

      // If the error is related to receipt generation, offer to skip it
      if (error.message && (error.message.includes("autoTable") || error.message.includes("getFontSize"))) {
        setSkipReceiptGeneration(true)
        toast({
          title: "Receipt Generation Error",
          description: "There was an error generating the receipt. Try again without generating a receipt.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to ${isEditing ? "update" : "complete"} the sale. ${error.message}`,
          variant: "destructive",
        })
      }
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
    <div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Cart Items</CardTitle>
              <CardDescription>Search for products or scan barcode to add items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                {/* Product Search with Recommendations */}
                <div className="relative">
                  <div className="flex w-full items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search products or scan barcode..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setShowSuggestions(true)
                        }}
                        className="pl-8"
                        ref={searchInputRef}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            // Try exact match for barcode first
                            const exactMatch = products.find((p) => p.sku === searchQuery.trim())
                            if (exactMatch) {
                              handleProductSelect(exactMatch)
                            } else if (filteredProducts.length > 0) {
                              // If no exact match but we have suggestions, select the first one
                              handleProductSelect(filteredProducts[0])
                            }
                          }
                        }}
                      />
                      {searchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-5 w-5 rounded-full"
                          onClick={() => {
                            setSearchQuery("")
                            setShowSuggestions(false)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        // Try exact match for barcode first
                        const exactMatch = products.find((p) => p.sku === searchQuery.trim())
                        if (exactMatch) {
                          handleProductSelect(exactMatch)
                        } else if (filteredProducts.length > 0) {
                          // If no exact match but we have suggestions, select the first one
                          handleProductSelect(filteredProducts[0])
                        }
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {/* Product Suggestions Dropdown */}
                  {showSuggestions && filteredProducts.length > 0 && (
                    <div
                      className="absolute z-10 mt-1 w-full max-w-[calc(100%-120px)] bg-white rounded-md border shadow-lg max-h-60 overflow-auto"
                      ref={suggestionsRef}
                    >
                      <ul className="py-1">
                        {filteredProducts.map((product) => (
                          <li
                            key={product.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                            onClick={() => handleProductSelect(product)}
                          >
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{formatCurrency(product.price)}</span>
                              <span className="text-sm text-gray-500">Stock: {product.quantity}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {cartItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item, index) => (
                        <TableRow key={item.id + index}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItemPrice(index, e.target.value)}
                                className="w-24 h-8"
                                min="0.01"
                                step="0.01"
                              />
                              <Edit className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = Number.parseInt(e.target.value, 10)
                                  if (!isNaN(newQuantity) && newQuantity >= 1 && newQuantity <= item.max_quantity) {
                                    updateItemQuantity(index, newQuantity)
                                  }
                                }}
                                className="w-16 h-8"
                                min="1"
                                max={item.max_quantity}
                              />
                              <span className="text-xs text-muted-foreground">Max: {item.max_quantity}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(item.total)}</TableCell>
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
                    <p className="text-muted-foreground">No items in cart</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Search for products or scan a barcode to add items
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                {isEditing ? "Update sale details" : "Complete the sale and generate receipt"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer-name">Customer Name (Optional)</Label>
                <Input
                  id="customer-name"
                  name="customer_name"
                  placeholder="Enter customer name"
                  value={formData.customer_name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="payment-status">Payment Status</Label>
                <RadioGroup
                  value={formData.payment_status}
                  onValueChange={(value) => handleSelectChange("payment_status", value)}
                  className="flex flex-col space-y-1 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Paid" id="paid" />
                    <Label htmlFor="paid" className="cursor-pointer">
                      Paid
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Partial" id="partial" />
                    <Label htmlFor="partial" className="cursor-pointer">
                      Partial Payment
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Unpaid" id="unpaid" />
                    <Label htmlFor="unpaid" className="cursor-pointer">
                      Credit Sale (Unpaid)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.payment_status === "Partial" && (
                <div>
                  <Label htmlFor="amount-paid">Amount Paid</Label>
                  <Input
                    id="amount-paid"
                    name="amount_paid"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter amount paid"
                    value={formData.amount_paid}
                    onChange={handleAmountPaidChange}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleSelectChange("payment_method", value)}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_method !== "Cash" && formData.payment_status !== "Unpaid" && (
                <div>
                  <Label htmlFor="payment-reference">Payment Reference</Label>
                  <Input
                    id="payment-reference"
                    name="payment_reference"
                    placeholder="Enter reference number"
                    value={formData.payment_reference}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Add notes about this sale"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>

                {formData.payment_status === "Partial" && (
                  <>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Amount Paid</span>
                      <span>{formatCurrency(formData.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Amount Due</span>
                      <span>{formatCurrency(formData.amount_due)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between font-bold text-lg mt-4">
                  <span>Total</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="skip-receipt"
                  checked={skipReceiptGeneration}
                  onCheckedChange={(checked) => setSkipReceiptGeneration(checked as boolean)}
                />
                <Label htmlFor="skip-receipt" className="text-sm cursor-pointer">
                  Skip receipt generation (if you encounter PDF errors)
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {skipReceiptGeneration && (
                <div className="text-amber-600 text-sm mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  Receipt generation will be skipped
                </div>
              )}
              <Button className="w-full" type="submit" disabled={loading || cartItems.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Processing..."}
                  </>
                ) : (
                  <>
                    {formData.payment_status === "Unpaid" ? (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {isEditing ? "Update Credit Sale" : "Complete Credit Sale"}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {isEditing ? "Update Sale" : "Complete Sale"}
                      </>
                    )}
                  </>
                )}
              </Button>
              {isEditing && !skipReceiptGeneration && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    setReceiptGenerating(true)
                    try {
                      const totalAmount = calculateTotal()
                      const amountPaid =
                        formData.payment_status === "Paid"
                          ? totalAmount
                          : formData.payment_status === "Unpaid"
                            ? 0
                            : formData.amount_paid
                      const amountDue = Math.max(0, totalAmount - amountPaid)

                      await generateAndDownloadReceipt(formData.receipt_number, totalAmount, amountPaid, amountDue)
                    } finally {
                      setReceiptGenerating(false)
                    }
                  }}
                  disabled={receiptGenerating}
                >
                  {receiptGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Receipt...
                    </>
                  ) : (
                    <>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Receipt
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCancel || (() => router.push("/sales"))}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
