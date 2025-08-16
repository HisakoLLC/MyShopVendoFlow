"use server"

import { formatDistanceToNow } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Hardcode the Supabase URL and service role key for development
// In production, these would come from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gipmcmzmbddavelbayк.supabase.co"
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcG1jbXptYmRkYXZlbGJheWsiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ2NTI0OTEzLCJleHAiOjIwNjIxMDA5MTN9.XHOZnsYdhedgZU1hBVbMkMwmk2Zc9O5t88zVOnX7JG4"

async function getRecentPurchases() {
  try {
    // Create a direct server client with the service role key
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: purchases, error } = await supabase
      .from("purchases")
      .select(`
        id, 
        reference_number, 
        purchase_date, 
        total_amount,
        suppliers (
          name
        )
      `)
      .order("purchase_date", { ascending: false })
      .limit(5)

    if (error) {
      console.error("Error fetching recent purchases:", error)
      return []
    }

    return purchases
  } catch (error) {
    console.error("Error in getRecentPurchases:", error)
    return []
  }
}

export async function RecentPurchases() {
  try {
    const recentPurchases = await getRecentPurchases()

    if (!recentPurchases || recentPurchases.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          No recent purchases to display
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentPurchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell className="font-medium">{purchase.reference_number}</TableCell>
              <TableCell>{purchase.suppliers?.name || "Unknown"}</TableCell>
              <TableCell>{formatDistanceToNow(new Date(purchase.purchase_date), { addSuffix: true })}</TableCell>
              <TableCell className="text-right">${Number(purchase.total_amount).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  } catch (error) {
    console.error("Error rendering RecentPurchases:", error)
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">Error loading purchase data</div>
    )
  }
}
