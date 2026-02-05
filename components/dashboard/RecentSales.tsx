"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Sale {
  sale_id: string
  receipt_number: string | null
  grand_total: number | null
  payment_method: string | null
  sale_date: string | null
  status?: string | null
}

interface RecentSalesProps {
  sales: Sale[]
  itemsPerSale: Record<string, number>
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(price)
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "N/A"
  return new Date(dateStr).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
}

export function RecentSales({
  sales,
  itemsPerSale,
}: RecentSalesProps) {
  if (sales.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No sales yet. Process your first sale to see insights.
      </div>
    )
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Receipt #</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Payment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.sale_id} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <TableCell className="font-medium">{formatTime(sale.sale_date)}</TableCell>
              <TableCell>
                <Link
                  href={`/sales/${sale.sale_id}`}
                  className="text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {sale.receipt_number ?? "—"}
                </Link>
              </TableCell>
              <TableCell>{itemsPerSale[sale.sale_id] || 0} items</TableCell>
              <TableCell className="font-medium">
                {sale.status === "refunded" ? (
                  <span className="text-zinc-500 dark:text-zinc-400 italic">Refunded</span>
                ) : (
                  formatPrice(sale.grand_total ?? 0)
                )}
              </TableCell>
              <TableCell>
                <span className="capitalize">{sale.payment_method || "N/A"}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
