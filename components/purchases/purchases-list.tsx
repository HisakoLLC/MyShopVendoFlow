"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, Edit, Trash2, Search, Plus } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PurchaseDetails } from "./purchase-details"
import { formatCurrency } from "@/lib/utils"
import {
  getPurchasesData,
  getPurchaseById,
  deletePurchase,
  type Purchase,
  type PurchaseItem,
} from "./purchases-data-provider"

export function PurchasesList() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [selectedPurchaseItems, setSelectedPurchaseItems] = useState<PurchaseItem[] | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    fetchPurchases()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPurchases(purchases)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredPurchases(
        purchases.filter(
          (purchase) =>
            purchase.reference_number.toLowerCase().includes(query) ||
            purchase.supplier_name?.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, purchases])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      const data = await getPurchasesData()
      setPurchases(data)
      setFilteredPurchases(data)
    } catch (error) {
      console.error("Error fetching purchases:", error)
      toast({
        title: "Error",
        description: "Failed to load purchases data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (id: string) => {
    try {
      const data = await getPurchaseById(id)
      if (data) {
        setSelectedPurchase(data.purchase)
        setSelectedPurchaseItems(data.items)
        setDetailsOpen(true)
      } else {
        throw new Error("Failed to load purchase details")
      }
    } catch (error) {
      console.error("Error fetching purchase details:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase details",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (id: string) => {
    setPurchaseToDelete(id)
  }

  const handleConfirmDelete = async () => {
    if (!purchaseToDelete) return

    try {
      const result = await deletePurchase(purchaseToDelete)

      if (result.success) {
        // Update local state
        setPurchases(purchases.filter((purchase) => purchase.id !== purchaseToDelete))
        toast({
          title: "Purchase deleted",
          description: "The purchase has been successfully deleted",
        })
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
      setPurchaseToDelete(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading purchases...</div>
  }

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 border rounded-lg">
        <p className="text-muted-foreground mb-4">No purchase records found</p>
        <Link href="/purchases/new">
          <Button>Create your first purchase</Button>
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
            placeholder="Search purchases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
        <Link href="/purchases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Purchase
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell className="font-medium">{purchase.reference_number}</TableCell>
                <TableCell>{purchase.supplier_name}</TableCell>
                <TableCell>{format(new Date(purchase.purchase_date), "MMM dd, yyyy")}</TableCell>
                <TableCell>{formatCurrency(purchase.total_amount)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(purchase.id)}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Link href={`/purchases/${purchase.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(purchase.id)}>
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
      <Dialog open={!!purchaseToDelete} onOpenChange={(open) => !open && setPurchaseToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase? This action cannot be undone and will revert inventory
              changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Details Modal */}
      <PurchaseDetails
        purchase={selectedPurchase}
        items={selectedPurchaseItems}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={(id) => {
          setDetailsOpen(false)
          window.location.href = `/purchases/${id}/edit`
        }}
      />
    </div>
  )
}
