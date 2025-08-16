import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

type SalesSummaryProps = {
  totalSales: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  currency?: string
}

export function SalesSummary({
  totalSales,
  totalAmount,
  paidAmount,
  unpaidAmount,
  currency = "KES",
}: SalesSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSales}</div>
          <p className="text-xs text-muted-foreground">Number of transactions</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalAmount, currency)}</div>
          <p className="text-xs text-muted-foreground">Value of all sales</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount, currency)}</div>
          <p className="text-xs text-muted-foreground">{((paidAmount / totalAmount) * 100).toFixed(1)}% of total</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unpaid Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(unpaidAmount, currency)}</div>
          <p className="text-xs text-muted-foreground">{((unpaidAmount / totalAmount) * 100).toFixed(1)}% of total</p>
        </CardContent>
      </Card>
    </div>
  )
}
