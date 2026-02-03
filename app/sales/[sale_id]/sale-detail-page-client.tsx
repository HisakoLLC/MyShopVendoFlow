"use client"

import { useRouter } from "next/navigation"
import { SaleDetailModal } from "@/components/sales/SaleDetailModal"

type Sale = {
  sale_id: string
  receipt_number: string | null
  sale_date: string | null
  grand_total: number | null
  payment_method: string | null
  store_id: string | null
  cashier_id: string | null
  customer_id: string | null
  notes: string | null
  status: string | null
  stores: { name: string } | null
  staff: { first_name: string | null; last_name: string | null } | null
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null
}

export function SaleDetailPageClient({ sale }: { sale: Sale }) {
  const router = useRouter()

  return (
    <SaleDetailModal
      sale={sale}
      onClose={() => router.push("/sales")}
    />
  )
}
