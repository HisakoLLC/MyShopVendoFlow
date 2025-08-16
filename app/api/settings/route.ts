import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    // Default store info in case of errors
    const defaultStoreInfo = {
      name: "AQSS Flow Limited",
      address: "Eastleigh, Nairobi",
      phone: "Phone: +254799964646",
      email: "Email: aqssflow@gmail.com",
    }

    // Get the server client with service role key
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      console.error("API: Failed to initialize Supabase client")
      return NextResponse.json(defaultStoreInfo)
    }

    try {
      // Try to fetch settings from the database
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .in("key", ["store_name", "store_address", "store_phone", "store_email"])

      if (error) {
        console.error("API: Error fetching settings:", error)
        return NextResponse.json(defaultStoreInfo)
      }

      // Create a store info object from settings
      const storeInfo = {
        name: data?.find((s) => s.key === "store_name")?.value || defaultStoreInfo.name,
        address: data?.find((s) => s.key === "store_address")?.value || defaultStoreInfo.address,
        phone: data?.find((s) => s.key === "store_phone")?.value || defaultStoreInfo.phone,
        email: data?.find((s) => s.key === "store_email")?.value || defaultStoreInfo.email,
      }

      return NextResponse.json(storeInfo)
    } catch (fetchError) {
      console.error("API: Exception fetching settings:", fetchError)
      return NextResponse.json(defaultStoreInfo)
    }
  } catch (error) {
    console.error("API: Error in settings route:", error)
    return NextResponse.json(
      {
        name: "AQSS Flow Limited",
        address: "Eastleigh, Nairobi",
        phone: "Phone: +254799964646",
        email: "Email: aqssflow@gmail.com",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: "Missing key or value" }, { status: 400 })
    }

    // Get the server client with service role key
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      console.error("API: Failed to initialize Supabase client")
      return NextResponse.json({ success: false, error: "Database connection failed" }, { status: 500 })
    }

    // Check if setting exists
    const { data, error: fetchError } = await supabase.from("settings").select("*").eq("key", key).maybeSingle()

    if (fetchError) {
      console.error(`API: Error checking if setting ${key} exists:`, fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    if (data) {
      // Update existing setting
      const { error: updateError } = await supabase
        .from("settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key)

      if (updateError) {
        console.error(`API: Error updating setting ${key}:`, updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }
    } else {
      // Create new setting
      const { error: insertError } = await supabase.from("settings").insert({
        key,
        value,
        description: `Store ${key.replace("store_", "")} setting`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error(`API: Error inserting setting ${key}:`, insertError)
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API: Error in settings POST route:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
