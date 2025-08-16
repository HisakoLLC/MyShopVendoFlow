"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, Eye, Search, Plus } from "lucide-react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProductDetails } from "./product-details"
import { ProductEditForm } from "./product-edit-form"
import { formatCurrency } from "@/lib/utils"

export function ProductsList() {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [productToDelete, setProductToDelete] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredProducts(
        products.filter(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            product.sku.toLowerCase().includes(query) ||
            (product.category && product.category.toLowerCase().includes(query)),
        ),
      )
    }
  }, [searchQuery, products])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("products").select("*").order("name")

      if (error) {
        throw error
      }

      setProducts(data || [])
      setFilteredProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (product) => {
    setProductToDelete(product)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return

    try {
      // Check if product is used in any sales or purchases
      const { data: saleItems, error: saleError } = await supabase
        .from("sale_items")
        .select("id")
        .eq("product_id", productToDelete.id)
        .limit(1)

      if (saleError) throw saleError

      if (saleItems && saleItems.length > 0) {
        toast({
          title: "Cannot delete product",
          description: "This product is used in sales records and cannot be deleted.",
          variant: "destructive",
        })
        setProductToDelete(null)
        return
      }

      const { data: purchaseItems, error: purchaseError } = await supabase
        .from("purchase_items")
        .select("id")
        .eq("product_id", productToDelete.id)
        .limit(1)

      if (purchaseError) throw purchaseError

      if (purchaseItems && purchaseItems.length > 0) {
        toast({
          title: "Cannot delete product",
          description: "This product is used in purchase records and cannot be deleted.",
          variant: "destructive",
        })
        setProductToDelete(null)
        return
      }

      // Delete the product
      const { error } = await supabase.from("products").delete().eq("id", productToDelete.id)

      if (error) throw error

      // Update local state
      setProducts(products.filter((p) => p.id !== productToDelete.id))

      toast({
        title: "Product deleted",
        description: `${productToDelete.name} has been removed from inventory`,
      })
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProductToDelete(null)
    }
  }

  const handleViewDetails = (product) => {
    setSelectedProduct(product)
    setDetailsOpen(true)
  }

  const handleEditProduct = (product) => {
    setSelectedProduct(product)
    setDetailsOpen(false)
    setEditOpen(true)
  }

  const handleEditSuccess = () => {
    fetchProducts()
    setEditOpen(false)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading inventory...</div>
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 border rounded-lg">
        <p className="text-muted-foreground mb-4">No products found</p>
        <Link href="/inventory/new">
          <Button>Add your first product</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
        <Link href="/inventory/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{product.category || "-"}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      product.quantity === 0
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                        : product.quantity < 10
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    }
                  >
                    {product.quantity}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(product)}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(product)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {productToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Details Modal */}
      <ProductDetails
        product={selectedProduct}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={() => handleEditProduct(selectedProduct)}
      />

      {/* Product Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Make changes to the product information below.</DialogDescription>
          </DialogHeader>
          <ProductEditForm
            productId={selectedProduct?.id}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
