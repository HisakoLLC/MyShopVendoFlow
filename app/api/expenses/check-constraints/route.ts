import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    // Let's check the existing data to see what values are actually in the database
    const { data: existingExpenses, error } = await supabase
      .from("expenses")
      .select("category, payment_method")
      .limit(10)

    if (error) {
      console.error("Error fetching existing expenses:", error)
    }

    // Let's also try to insert a test record with the original schema values
    const testCategories = ["Utilities", "Supplies", "Rent", "Transport", "Other"]
    const testPaymentMethods = ["Cash", "M-Pesa", "Bank"]

    return NextResponse.json({
      existingData: existingExpenses || [],
      testCategories,
      testPaymentMethods,
      message: "Check what values are currently in the database",
    })
  } catch (error) {
    console.error("Error checking constraints:", error)
    return NextResponse.json({ error: "Failed to check constraints" }, { status: 500 })
  }
}
