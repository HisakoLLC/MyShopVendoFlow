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
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    console.log("Metrics API called with params:", { category, startDate, endDate })

    // Base query - get all expenses
    let query = supabase.from("expenses").select("amount, expense_date, created_at")

    // Apply category filter
    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    // Apply date range filter
    if (startDate && endDate) {
      query = query.gte("expense_date", startDate).lte("expense_date", endDate)
    }

    const { data: expenses, error } = await query

    if (error) {
      console.error("Error fetching expenses for metrics:", error)
      return NextResponse.json({ error: "Failed to fetch expense data" }, { status: 500 })
    }

    console.log(`Found ${expenses?.length || 0} expenses for metrics calculation`)

    // Calculate metrics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const todayExpenses =
      expenses?.filter((expense) => {
        const expenseDate = new Date(expense.expense_date)
        return expenseDate >= today
      }) || []

    const monthExpenses =
      expenses?.filter((expense) => {
        const expenseDate = new Date(expense.expense_date)
        return expenseDate >= startOfMonth
      }) || []

    const allTimeExpenses = expenses || []

    const metrics = {
      today: {
        total: todayExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
        count: todayExpenses.length,
      },
      month: {
        total: monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
        count: monthExpenses.length,
      },
      allTime: {
        total: allTimeExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
        count: allTimeExpenses.length,
      },
    }

    console.log("Calculated metrics:", metrics)

    return NextResponse.json(metrics)
  } catch (error) {
    console.error("Error in expense metrics GET:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
