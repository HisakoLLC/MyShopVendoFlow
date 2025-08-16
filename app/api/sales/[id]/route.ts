import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { type NextRequest, NextResponse } from "next/server"

// Get Supabase URL and service role key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate parameters
    if (!params.id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 })
    }

    const id = params.id

    // Create a direct server client with the service role key
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get the sale
    const { data: sale, error: saleError } = await supabase.from("sales").select("*").eq("id", id).single()

    if (saleError) {
      // Handle "not found" case specifically
      if (saleError.code === "PGRST116") {
        return NextResponse.json({ error: "Sale not found" }, { status: 404 })
      }
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }

    // Get the sale items with product details
    const { data: items, error: itemsError } = await supabase
      .from("sale_items")
      .select(`
        id,
        sale_id,
        product_id,
        quantity,
        unit_price,
        total_price,
        products (
          id,
          name,
          sku,
          price,
          quantity
        )
      `)
      .eq("sale_id", id)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json({ sale, items })
  } catch (error) {
    console.error("Error fetching sale:", error)
    // Ensure we always return a valid JSON response
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch sale details"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
