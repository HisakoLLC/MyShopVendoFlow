import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export async function GET() {
  try {
    // Log environment variables (safely)
    console.log("Environment variables check:")
    console.log("NEXT_PUBLIC_SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("SUPABASE_URL:", !!process.env.SUPABASE_URL)
    console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log("SUPABASE_ANON_KEY:", !!process.env.SUPABASE_ANON_KEY)
    console.log("SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Get Supabase URL and service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: "Missing required environment variables",
          variables: {
            supabaseUrl: !!supabaseUrl,
            serviceRoleKey: !!serviceRoleKey,
          },
        },
        { status: 500 },
      )
    }

    // Create a direct server client with the service role key
    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Test connection with a simple query
    const { data: productsCount, error: productsError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })

    if (productsError) {
      return NextResponse.json(
        {
          error: "Database query error",
          details: productsError,
          variables: {
            supabaseUrl: !!supabaseUrl,
            serviceRoleKey: !!serviceRoleKey,
          },
        },
        { status: 500 },
      )
    }

    // Try a more complex query
    const { data: products, error: productsListError } = await supabase.from("products").select("id, name").limit(5)

    if (productsListError) {
      return NextResponse.json(
        {
          error: "Products list query error",
          details: productsListError,
          variables: {
            supabaseUrl: !!supabaseUrl,
            serviceRoleKey: !!serviceRoleKey,
          },
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      productsCount,
      products,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
