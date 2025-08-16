"use client"

import { useParams } from "next/navigation"
import { PurchaseEditForm } from "@/components/purchases/purchase-edit-form"

export default function EditPurchasePage() {
  const params = useParams()
  const purchaseId = params.id as string

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Edit Purchase</h2>
        </div>

        <PurchaseEditForm purchaseId={purchaseId} />
      </div>
    </div>
  )
}
