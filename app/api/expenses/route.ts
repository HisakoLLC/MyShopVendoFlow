import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role key for admin operations
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category") || ""
    const paymentMethod = searchParams.get("paymentMethod") || ""
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let query = supabase.from("expenses").select("*", { count: "exact" }).order("expense_date", { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    if (category) {
      query = query.eq("category", category)
    }

    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod)
    }

    if (startDate) {
      query = query.gte("expense_date", startDate)
    }

    if (endDate) {
      query = query.lte("expense_date", endDate)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching expenses:", error)
      return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
    }

    return NextResponse.json({
      expenses: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error in expenses GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, category, amount, payment_method, expense_date, notes, attachment_url, recorded_by } = body

    // Validate required fields
    if (!title || !category || !amount || !payment_method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate amount is a positive number
    const numericAmount = Number.parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    // Categories from the original schema CHECK constraint
    const allowedCategories = ["Utilities", "Supplies", "Rent", "Transport", "Other"]

    if (!allowedCategories.includes(category)) {
      return NextResponse.json(
        {
          error: "Invalid category",
          details: `Category must be one of: ${allowedCategories.join(", ")}. Received: "${category}"`,
        },
        { status: 400 },
      )
    }

    // Payment methods - keeping it flexible for now
    const allowedPaymentMethods = ["Cash", "M-Pesa", "Bank", "Card", "Cheque"]

    if (!allowedPaymentMethods.includes(payment_method)) {
      return NextResponse.json(
        {
          error: "Invalid payment method",
          details: `Payment method must be one of: ${allowedPaymentMethods.join(", ")}. Received: "${payment_method}"`,
        },
        { status: 400 },
      )
    }

    const expenseData = {
      title: title.trim(),
      category,
      amount: numericAmount,
      payment_method,
      expense_date: expense_date || new Date().toISOString(),
      notes: notes?.trim() || null,
      attachment_url: attachment_url?.trim() || null,
      recorded_by: recorded_by?.trim() || "Admin",
    }

    console.log("Creating expense with data:", expenseData)

    const { data, error } = await supabase.from("expenses").insert([expenseData]).select().single()

    if (error) {
      console.error("Supabase error creating expense:", error)
      return NextResponse.json(
        {
          error: "Failed to create expense",
          details: error.message,
          data: expenseData,
        },
        { status: 500 },
      )
    }

    console.log("Successfully created expense:", data)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in expenses POST:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
