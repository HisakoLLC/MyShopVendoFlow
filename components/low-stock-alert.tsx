"use server"

import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Replace the hardcoded Supabase URL and service key with proper environment variable handling
// Remove the problematic Cyrillic character in the URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Update the getLowStockProducts function to handle missing environment variables
async function getLowStockProducts() {
  try {
    // Check if environment variables are available
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("Missing Supabase environment variables")
      return []
    }

    // Create a direct server client with the service role key
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Use a simpler query first to test permissions
    const { data: testData, error: testError } = await supabase.from("products").select("id").limit(1)

    if (testError) {
      console.error("Test query error:", testError)
      return []
    }

    // If test query succeeds, proceed with the actual query
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, quantity, category")
      .lt("quantity", 10)
      .order("quantity", { ascending: true })
      .limit(5)

    if (error) {
      console.error("Error fetching low stock products:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Error in getLowStockProducts:", error)
    return []
  }
}

export async function LowStockAlert() {
  try {
    const lowStockProducts = await getLowStockProducts()

    if (!lowStockProducts || lowStockProducts.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-muted-foreground">No low stock items to display</div>
      )
    }

    return (
      <div className="space-y-4">
        {lowStockProducts.map((product) => (
          <div key={product.id} className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{product.name}</p>
              <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            </div>
            <div className="flex items-center gap-2">
              {product.category && (
                <Badge variant="outline" className="text-xs">
                  {product.category}
                </Badge>
              )}
              <Badge
                variant={product.quantity === 0 ? "destructive" : "outline"}
                className={`${product.quantity === 0 ? "bg-red-500" : "bg-orange-500 text-white"}`}
              >
                {product.quantity === 0 ? (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Out of Stock
                  </span>
                ) : (
                  `${product.quantity} left`
                )}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    )
  } catch (error) {
    console.error("Error rendering LowStockAlert:", error)
    return <div className="flex items-center justify-center h-40 text-muted-foreground">Error loading stock data</div>
  }
}
