"use server"

import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Download } from "lucide-react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Hardcode the Supabase URL and service role key for development
// In production, these would come from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gipmcmzmbddavelbayк.supabase.co"
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcG1jbXptYmRkYXZlbGJheWsiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ2NTI0OTEzLCJleHAiOjIwNjIxMDA5MTN9.XHOZnsYdhedgZU1hBVbMkMwmk2Zc9O5t88zVOnX7JG4"

async function getSales() {
  try {
    // Create a direct server client with the service role key
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: false })

    if (error) {
      console.error("Error fetching sales:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Error in getSales:", error)
    return []
  }
}

export async function SalesList() {
  try {
    const sales = await getSales()

    if (!sales || sales.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-60 border rounded-lg">
          <p className="text-muted-foreground mb-4">No sales records found</p>
          <Link href="/sales/new">
            <Button>Create your first sale</Button>
          </Link>
        </div>
      )
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.receipt_number}</TableCell>
                <TableCell>{format(new Date(sale.sale_date), "MMM dd, yyyy")}</TableCell>
                <TableCell>${Number(sale.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      sale.payment_method === "Cash"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                    }
                  >
                    {sale.payment_method}
                  </Badge>
                </TableCell>
                <TableCell>{sale.payment_reference || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/sales/${sale.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download Receipt</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  } catch (error) {
    console.error("Error rendering SalesList:", error)
    return (
      <div className="flex flex-col items-center justify-center h-60 border rounded-lg">
        <p className="text-muted-foreground mb-4">Error loading sales data</p>
        <Link href="/sales/new">
          <Button>Create a new sale</Button>
        </Link>
      </div>
    )
  }
}
