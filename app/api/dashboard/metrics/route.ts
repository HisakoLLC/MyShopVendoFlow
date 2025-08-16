import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    if (!supabase) {
      return NextResponse.json({ error: "Failed to initialize database client" }, { status: 500 })
    }

    // Get today's date at midnight in UTC (Supabase uses UTC)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayISOString = today.toISOString()

    // Get first day of current month in UTC
    const firstDayOfMonth = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1)
    const firstDayOfMonthISOString = firstDayOfMonth.toISOString()

    // Fetch today's revenue
    const { data: todaySales, error: todayError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("sale_date", todayISOString)

    if (todayError) {
      console.error("API: Error fetching today's sales:", todayError)
      return NextResponse.json({ error: "Error fetching today's sales" }, { status: 500 })
    }

    // Fetch month's revenue
    const { data: monthSales, error: monthError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("sale_date", firstDayOfMonthISOString)

    if (monthError) {
      console.error("API: Error fetching month's sales:", monthError)
      return NextResponse.json({ error: "Error fetching month's sales" }, { status: 500 })
    }

    // Count unique customers
    const { data: customers, error: customersError } = await supabase
      .from("sales")
      .select("customer_name")
      .not("customer_name", "is", null)

    if (customersError) {
      console.error("API: Error fetching customers:", customersError)
      return NextResponse.json({ error: "Error fetching customers" }, { status: 500 })
    }

    // Count products with low stock
    const { data: lowStockProducts, error: stockError } = await supabase
      .from("products")
      .select("id")
      .lt("quantity", 10)

    if (stockError) {
      console.error("API: Error fetching low stock products:", stockError)
      return NextResponse.json({ error: "Error fetching low stock products" }, { status: 500 })
    }

    // Calculate totals
    const todayTotal = todaySales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0
    const monthTotal = monthSales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0

    // Get unique customer count
    const uniqueCustomers = new Set()
    customers?.forEach((sale) => {
      if (sale.customer_name) {
        uniqueCustomers.add(sale.customer_name.toLowerCase().trim())
      }
    })

    return NextResponse.json({
      todayRevenue: todayTotal,
      monthRevenue: monthTotal,
      totalCustomers: uniqueCustomers.size,
      lowStockCount: lowStockProducts?.length || 0,
    })
  } catch (error) {
    console.error("API: Unhandled error in metrics route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
