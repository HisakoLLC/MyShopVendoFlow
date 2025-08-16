"use client"

import { useParams } from "next/navigation"
import { ProductEditForm } from "@/components/inventory/product-edit-form"

export default function EditProductPage() {
  const params = useParams()
  const productId = params.id as string

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Edit Product</h2>
        </div>

        <ProductEditForm productId={productId} />
      </div>
    </div>
  )
}
