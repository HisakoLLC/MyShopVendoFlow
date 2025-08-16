import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    // Get the server client with service role key
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      console.error("API: Failed to initialize Supabase client")
      return NextResponse.json([])
    }

    // Fetch products from the database
    const { data, error } = await supabase.from("products").select("*").gt("quantity", 0)

    if (error) {
      console.error("API: Error fetching products:", error)
      return NextResponse.json([])
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API: Error in products route:", error)
    return NextResponse.json([], { status: 500 })
  }
}
