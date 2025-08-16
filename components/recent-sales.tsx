"use server"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Hardcode the Supabase URL and service role key for development
// In production, these would come from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gipmcmzmbddavelbayк.supabase.co"
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcG1jbXptYmRkYXZlbGJheWsiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ2NTI0OTEzLCJleHAiOjIwNjIxMDA5MTN9.XHOZnsYdhedgZU1hBVbMkMwmk2Zc9O5t88zVOnX7JG4"

async function getRecentSales() {
  try {
    // Create a direct server client with the service role key
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase
      .from("sales")
      .select(`
        id, 
        receipt_number, 
        sale_date, 
        total_amount, 
        payment_method
      `)
      .order("sale_date", { ascending: false })
      .limit(5)

    if (error) {
      console.error("Error fetching recent sales:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Error in getRecentSales:", error)
    return []
  }
}

export async function RecentSales() {
  try {
    const recentSales = await getRecentSales()

    if (!recentSales || recentSales.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-muted-foreground">No recent sales to display</div>
      )
    }

    return (
      <div className="space-y-8">
        {recentSales.map((sale) => (
          <div key={sale.id} className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary">
                {sale.payment_method.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">{sale.receipt_number}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(sale.sale_date), { addSuffix: true })}
              </p>
            </div>
            <div className="ml-auto font-medium">+${Number(sale.total_amount).toFixed(2)}</div>
          </div>
        ))}
      </div>
    )
  } catch (error) {
    console.error("Error rendering RecentSales:", error)
    return <div className="flex items-center justify-center h-40 text-muted-foreground">Error loading sales data</div>
  }
}
