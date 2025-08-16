"use server"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import type { Sale } from "./sales-table"

// Get Supabase URL and service role key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function getSalesData() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Missing Supabase environment variables")
    }

    // Create a direct server client with the service role key
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: false })

    if (error) {
      throw error
    }

    // Transform data to match the Sale type
    const sales: Sale[] = data.map((sale) => ({
      id: sale.id,
      receipt_number: sale.receipt_number,
      sale_date: sale.sale_date,
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      payment_reference: sale.payment_reference,
      notes: sale.notes,
      customer_name: sale.customer_name || "Walk-in Customer",
      paymentStatus: getPaymentStatus(sale),
      amount_paid: sale.amount_paid || sale.total_amount, // Default to total if not set
      amount_due: calculateAmountDue(sale), // Calculate amount due
    }))

    return sales
  } catch (error) {
    console.error("Error fetching sales data:", error)
    return []
  }
}

// Helper function to calculate amount due
function calculateAmountDue(sale: any): number {
  // If amount_due exists in the database, use it
  if (sale.amount_due !== undefined && sale.amount_due !== null) {
    return sale.amount_due
  }

  // Otherwise calculate it from total and amount paid
  const amountPaid = sale.amount_paid || 0
  return Math.max(0, sale.total_amount - amountPaid)
}

// Helper function to determine payment status
function getPaymentStatus(sale: any): string {
  if (sale.payment_status) {
    return sale.payment_status // Use existing status if available
  }

  // Calculate based on amounts if status not explicitly set
  if (!sale.amount_paid || sale.amount_paid === 0) {
    return "Unpaid"
  } else if (sale.amount_paid >= sale.total_amount) {
    return "Paid"
  } else {
    return "Partial"
  }
}

export async function deleteSale(id: string) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Missing Supabase environment variables")
    }

    // Create a direct server client with the service role key
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // First, get the sale items to restore product quantities
    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select("product_id, quantity")
      .eq("sale_id", id)

    if (itemsError) {
      throw itemsError
    }

    // Restore product quantities
    for (const item of saleItems || []) {
      // Get current product quantity
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", item.product_id)
        .single()

      if (productError) {
        throw productError
      }

      // Update product quantity
      const { error: updateError } = await supabase
        .from("products")
        .update({
          quantity: product.quantity + item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.product_id)

      if (updateError) {
        throw updateError
      }
    }

    // Delete sale items
    const { error: deleteItemsError } = await supabase.from("sale_items").delete().eq("sale_id", id)

    if (deleteItemsError) {
      throw deleteItemsError
    }

    // Delete the sale
    const { error: deleteSaleError } = await supabase.from("sales").delete().eq("id", id)

    if (deleteSaleError) {
      throw deleteSaleError
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting sale:", error)
    return { success: false, error }
  }
}

// Update payment status for a sale
export async function updatePaymentStatus(id: string, status: string, amountPaid: number) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Missing Supabase environment variables")
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get the sale to calculate amount due
    const { data: sale, error: saleError } = await supabase.from("sales").select("total_amount").eq("id", id).single()

    if (saleError) {
      throw saleError
    }

    // Calculate amount due
    const amountDue = Math.max(0, sale.total_amount - amountPaid)

    // Update the sale with new payment status
    const { error: updateError } = await supabase
      .from("sales")
      .update({
        payment_status: status,
        amount_paid: amountPaid,
        amount_due: amountDue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      throw updateError
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating payment status:", error)
    return { success: false, error }
  }
}
