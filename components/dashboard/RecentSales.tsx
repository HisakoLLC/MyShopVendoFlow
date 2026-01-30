"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format-currency"
import { cn } from "@/lib/utils"

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return date.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined })
}

function PaymentBadge({ method }: { method: string | null }) {
  if (!method) return <span className="text-slate-500">—</span>
  const m = method.toLowerCase()
  const styles: Record<string, string> = {
    "m-pesa": "bg-success-500/10 text-success-700 dark:text-success-400",
    cash: "bg-primary-500/10 text-primary-700 dark:text-primary-400",
    card: "bg-secondary-500/10 text-secondary-700 dark:text-secondary-400",
  }
  const style = styles[m] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        style
      )}
    >
      {method}
    </span>
  )
}

export interface SaleWithCustomer {
  sale_id: string
  receipt_number: string | null
  grand_total: number | null
  payment_method: string | null
  sale_date: string | null
  store_id: string | null
  customer_name?: string | null
}

interface RecentSalesProps {
  sales: SaleWithCustomer[]
  itemsPerSale: Record<string, number>
}

export function RecentSales({ sales, itemsPerSale }: RecentSalesProps) {
  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          <ShoppingBag className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          No sales yet
        </h3>
        <p className="mt-1 max-w-sm text-center text-sm text-slate-600 dark:text-slate-400">
          Process your first sale in POS to see it here.
        </p>
        <Button asChild className="mt-6">
          <Link href="/pos">Go to POS</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="text-slate-600 dark:text-slate-400">Time</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-400">Receipt #</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-400">Customer</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-400">Items</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-400">Total</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-400">Payment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow
              key={sale.sale_id}
              className="cursor-pointer border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
              asChild
            >
              <Link href={`/sales/${sale.sale_id}`} className="contents">
                <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                  {formatRelativeTime(sale.sale_date)}
                </TableCell>
                <TableCell>
                  <span className="text-primary-600 hover:underline dark:text-primary-400">
                    {sale.receipt_number ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="max-w-[140px] truncate text-slate-600 dark:text-slate-400">
                  {sale.customer_name ?? "Walk-in"}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {itemsPerSale[sale.sale_id] ?? 0} items
                </TableCell>
                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(sale.grand_total ?? 0)}
                </TableCell>
                <TableCell>
                  <PaymentBadge method={sale.payment_method} />
                </TableCell>
              </Link>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
