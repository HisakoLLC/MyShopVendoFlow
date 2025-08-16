import { getSupabaseServerClient } from "@/lib/supabase"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get the current date in YYYYMMDD format
    const today = new Date()
    const datePrefix =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0")

    // Get the latest receipt number with today's date prefix
    const { data, error } = await supabase
      .from("sales")
      .select("receipt_number")
      .like("receipt_number", `${datePrefix}%`)
      .order("receipt_number", { ascending: false })
      .limit(1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let sequenceNumber = 1
    if (data && data.length > 0) {
      // Extract the sequence number from the latest receipt number
      const latestReceiptNumber = data[0].receipt_number
      const latestSequence = Number.parseInt(latestReceiptNumber.substring(datePrefix.length), 10)
      sequenceNumber = latestSequence + 1
    }

    // Generate the new receipt number
    const receiptNumber = `${datePrefix}${sequenceNumber.toString().padStart(4, "0")}`

    return NextResponse.json({ receiptNumber })
  } catch (error) {
    console.error("Error generating receipt number:", error)
    return NextResponse.json({ error: "Failed to generate receipt number" }, { status: 500 })
  }
}
