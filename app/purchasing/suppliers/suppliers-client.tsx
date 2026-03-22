"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Mail, 
  Phone, 
  Package 
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SupplierQuickAddModal } from "@/components/purchasing/SupplierQuickAddModal"
import { deleteSupplier } from "@/app/purchasing/actions"
import type { Supplier } from "./page"

export function SuppliersClient({ 
  initialSuppliers 
}: { 
  initialSuppliers: Supplier[] 
}) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [selectedSupplier, setSelectedSupplier] = React.useState<any>(null)

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedSupplier(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (supplierId: string) => {
    if (!confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
      return
    }

    try {
      await deleteSupplier(supplierId)
      toast.success("Supplier deleted successfully")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete supplier")
    }
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex items-start justify-between border-b border-zinc-800 pb-6 mb-6">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
            MANAGE YOUR SUPPLIER CONTACTS AND PAYMENT TERMS
          </p>
          <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
            Suppliers
          </h1>
        </div>
        <Button 
          onClick={handleAdd} 
          className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors border-none"
        >
          + ADD SUPPLIER
        </Button>
      </div>

      {/* Main Table Section */}
      <div className="w-full">
        {initialSuppliers.length === 0 ? (
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 px-6 py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-sm font-semibold text-zinc-400">No suppliers yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Add your first supplier to start creating purchase orders.
            </p>
            <Button onClick={handleAdd} size="sm" variant="outline" className="mt-6 gap-2 border-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-sm">
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 overflow-hidden w-full">
            <Table className="table-fixed w-full">
              <TableHeader className="bg-zinc-950/50 border-b border-zinc-800">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="w-[22%] px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Name</TableHead>
                  <TableHead className="w-[22%] px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Email</TableHead>
                  <TableHead className="w-[16%] px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Phone</TableHead>
                  <TableHead className="w-[30%] px-4 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Payment Terms</TableHead>
                  <TableHead className="w-[10%] px-4 py-3 text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialSuppliers.map((s) => (
                  <TableRow key={s.supplier_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors last:border-0">
                    <TableCell className="px-4 py-3.5 text-sm font-semibold text-zinc-100 whitespace-nowrap">
                      {s.name}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-zinc-400 whitespace-nowrap">
                      {s.email || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-sm text-zinc-400 whitespace-nowrap">
                      {s.phone || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-zinc-500">
                      {s.payment_terms || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(s)}
                          className="w-8 h-8 rounded-sm hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.supplier_id)}
                          className="w-8 h-8 rounded-sm hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <SupplierQuickAddModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          router.refresh()
        }}
        supplier={selectedSupplier}
      />
    </>
  )
}
