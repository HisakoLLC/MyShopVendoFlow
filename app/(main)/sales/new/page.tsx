"use client"

import { SaleEditForm } from "@/components/sales/sale-edit-form"
import { GoBack } from "@/components/go-back"

export default function NewSalePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <GoBack href="/sales" />
        <h1 className="text-3xl font-bold tracking-tight ml-4">New Sale</h1>
      </div>
      <SaleEditForm />
    </div>
  )
}
