import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from("expenses").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Error fetching expense:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Expense not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in expense GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { title, category, amount, payment_method, expense_date, notes, attachment_url } = body

    // Validate required fields
    if (!title || !category || !amount || !payment_method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate amount is a positive number
    const numericAmount = Number.parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    const updateData = {
      title: title.trim(),
      category,
      amount: numericAmount,
      payment_method,
      expense_date: expense_date || new Date().toISOString(),
      notes: notes?.trim() || null,
      attachment_url: attachment_url?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    console.log("Updating expense with data:", updateData)

    const { data, error } = await supabase.from("expenses").update(updateData).eq("id", params.id).select().single()

    if (error) {
      console.error("Error updating expense:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Expense not found" }, { status: 404 })
      }
      return NextResponse.json(
        {
          error: "Failed to update expense",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("Successfully updated expense:", data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in expense PUT:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("Deleting expense with ID:", params.id)

    // First check if the expense exists
    const { data: existingExpense, error: fetchError } = await supabase
      .from("expenses")
      .select("id, title")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      console.error("Error checking expense existence:", fetchError)
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Expense not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to verify expense" }, { status: 500 })
    }

    // Delete the expense
    const { error: deleteError } = await supabase.from("expenses").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting expense:", deleteError)
      return NextResponse.json(
        {
          error: "Failed to delete expense",
          details: deleteError.message,
        },
        { status: 500 },
      )
    }

    console.log("Successfully deleted expense:", existingExpense.title)
    return NextResponse.json({
      message: "Expense deleted successfully",
      deletedExpense: existingExpense,
    })
  } catch (error) {
    console.error("Error in expense DELETE:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
