"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Edit, ArrowLeft, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { getPurchaseById, deletePurchase } from "@/components/purchases/purchases-data-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function PurchaseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const purchaseId = params.id as string
  const [purchase, setPurchase] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    // If the ID is "new", redirect to the new purchase page
    if (purchaseId === "new") {
      router.push("/purchases/new")
      return
    }

    fetchPurchaseDetails()
  }, [purchaseId, router])

  const fetchPurchaseDetails = async () => {
    try {
      setLoading(true)
      const data = await getPurchaseById(purchaseId)
      if (data) {
        setPurchase(data.purchase)
        setItems(data.items)
      } else {
        toast({
          title: "Error",
          description: "Failed to load purchase details",
          variant: "destructive",
        })
        router.push("/purchases")
      }
    } catch (error) {
      console.error("Error fetching purchase details:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase details",
        variant: "destructive",
      })
      router.push("/purchases")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const result = await deletePurchase(purchaseId)

      if (result.success) {
        toast({
          title: "Purchase deleted",
          description: "The purchase has been successfully deleted",
        })
        router.push("/purchases")
      } else {
        throw new Error("Failed to delete purchase")
      }
    } catch (error) {
      console.error("Error deleting purchase:", error)
      toast({
        title: "Error",
        description: "Failed to delete purchase. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  // If the ID is "new", we'll redirect in the useEffect
  if (purchaseId === "new") {
    return null
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading purchase details...</div>
  }

  if (!purchase) {
    return <div className="flex justify-center p-8">Purchase not found</div>
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/purchases")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Purchases
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} className="text-red-500">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={() => router.push(`/purchases/${purchaseId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Purchase
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
            <CardDescription>Reference #{purchase.reference_number}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Date</dt>
                <dd className="text-sm">{format(new Date(purchase.purchase_date), "PPP")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Supplier</dt>
                <dd className="text-sm">{purchase.supplier_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Total Amount</dt>
                <dd className="text-sm font-bold">{formatCurrency(purchase.total_amount)}</dd>
              </div>
              {purchase.notes && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                  <dd className="text-sm">{purchase.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Purchase Items</CardTitle>
            <CardDescription>Products included in this purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.product_sku}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase? This action cannot be undone and will revert inventory
              changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
