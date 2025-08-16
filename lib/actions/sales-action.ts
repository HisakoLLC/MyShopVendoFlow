"use server"

import { getSupabaseServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

// Type for cart items
type CartItem = {
  id: string
  name: string
  sku: string
  price: number
  quantity: number
  total: number
  max_quantity: number
}

// Type for sale data
type SaleData = {
  receipt_number: string
  payment_method: string
  payment_reference: string | null
  notes: string | null
  customer_name: string | null
  payment_status: string
  amount_paid: number
  total_amount: number
}

// Function to generate receipt number directly using Supabase
export async function generateReceiptNumber() {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      throw new Error("Database connection failed")
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
      throw new Error(`Error fetching latest receipt number: ${error.message}`)
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
    return receiptNumber
  } catch (error) {
    console.error("Error generating receipt number:", error)
    throw error
  }
}

// Create a new sale
export async function createSale(saleData: SaleData, cartItems: CartItem[]) {
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    throw new Error("Database connection failed")
  }

  try {
    // Create the sale record
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        receipt_number: saleData.receipt_number,
        total_amount: saleData.total_amount,
        payment_method: saleData.payment_method,
        payment_reference: saleData.payment_reference,
        notes: saleData.notes,
        customer_name: saleData.customer_name,
        payment_status: saleData.payment_status,
        amount_paid: saleData.amount_paid,
        amount_due: saleData.total_amount - saleData.amount_paid,
      })
      .select()
      .single()

    if (saleError) throw saleError

    // Create sale items and update inventory
    for (const item of cartItems) {
      // Add sale item
      const { error: itemError } = await supabase.from("sale_items").insert({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.total,
      })

      if (itemError) throw itemError

      // Update product quantity
      const { error: updateError } = await supabase
        .from("products")
        .update({
          quantity: item.max_quantity - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)

      if (updateError) throw updateError
    }

    revalidatePath("/sales")
    return { success: true, saleId: sale.id, receiptNumber: sale.receipt_number }
  } catch (error) {
    console.error("Error creating sale:", error)
    return { success: false, error: error.message }
  }
}

// Update an existing sale
export async function updateSale(saleId: string, saleData: SaleData, cartItems: CartItem[]) {
  console.log("Updating sale:", saleId, saleData, cartItems)

  const supabase = getSupabaseServerClient()

  if (!supabase) {
    throw new Error("Database connection failed")
  }

  try {
    // Calculate amount_due
    const amountDue = Math.max(0, saleData.total_amount - saleData.amount_paid)

    // Update the sale record
    const { error: saleError } = await supabase
      .from("sales")
      .update({
        payment_method: saleData.payment_method,
        payment_reference: saleData.payment_reference,
        notes: saleData.notes,
        total_amount: saleData.total_amount,
        customer_name: saleData.customer_name,
        payment_status: saleData.payment_status,
        amount_paid: saleData.amount_paid,
        amount_due: amountDue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", saleId)

    if (saleError) {
      console.error("Error updating sale record:", saleError)
      throw saleError
    }

    // Get existing sale items to compare with current cart
    const { data: existingItems, error: itemsError } = await supabase
      .from("sale_items")
      .select("id, product_id, quantity")
      .eq("sale_id", saleId)

    if (itemsError) {
      console.error("Error fetching existing items:", itemsError)
      throw itemsError
    }

    console.log("Existing items:", existingItems)
    console.log("Cart items:", cartItems)

    // Process each item in the cart
    for (const item of cartItems) {
      const existingItem = existingItems?.find((ei) => ei.product_id === item.id)

      if (existingItem) {
        // Update existing item
        const quantityDiff = item.quantity - existingItem.quantity

        // Update sale item
        const { error: updateItemError } = await supabase
          .from("sale_items")
          .update({
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.total,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingItem.id)

        if (updateItemError) {
          console.error("Error updating sale item:", updateItemError)
          throw updateItemError
        }

        // Update product quantity if it changed
        if (quantityDiff !== 0) {
          const { data: product, error: productError } = await supabase
            .from("products")
            .select("quantity")
            .eq("id", item.id)
            .single()

          if (productError) {
            console.error("Error fetching product:", productError)
            throw productError
          }

          const { error: updateProductError } = await supabase
            .from("products")
            .update({
              quantity: product.quantity - quantityDiff,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id)

          if (updateProductError) {
            console.error("Error updating product quantity:", updateProductError)
            throw updateProductError
          }
        }
      } else {
        // Add new item
        const { error: newItemError } = await supabase.from("sale_items").insert({
          sale_id: saleId,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.total,
        })

        if (newItemError) {
          console.error("Error adding new sale item:", newItemError)
          throw newItemError
        }

        // Update product quantity
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", item.id)
          .single()

        if (productError) {
          console.error("Error fetching product for new item:", productError)
          throw productError
        }

        const { error: updateProductError } = await supabase
          .from("products")
          .update({
            quantity: product.quantity - item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)

        if (updateProductError) {
          console.error("Error updating product quantity for new item:", updateProductError)
          throw updateProductError
        }
      }
    }

    // Handle deleted items (items that were in the original sale but not in the current cart)
    for (const existingItem of existingItems || []) {
      const stillExists = cartItems.some((item) => item.id === existingItem.product_id)

      if (!stillExists) {
        // Delete the item
        const { error: deleteItemError } = await supabase.from("sale_items").delete().eq("id", existingItem.id)

        if (deleteItemError) {
          console.error("Error deleting sale item:", deleteItemError)
          throw deleteItemError
        }

        // Return quantity to product
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", existingItem.product_id)
          .single()

        if (productError) {
          console.error("Error fetching product for deleted item:", productError)
          throw productError
        }

        const { error: updateProductError } = await supabase
          .from("products")
          .update({
            quantity: product.quantity + existingItem.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingItem.product_id)

        if (updateProductError) {
          console.error("Error updating product quantity for deleted item:", updateProductError)
          throw updateProductError
        }
      }
    }

    revalidatePath("/sales")
    return { success: true, saleId: saleId, receiptNumber: saleData.receipt_number }
  } catch (error) {
    console.error("Error updating sale:", error)
    return { success: false, error: error.message }
  }
}

// Get products with stock
export async function getProductsWithStock() {
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    throw new Error("Database connection failed")
  }

  try {
    const { data, error } = await supabase.from("products").select("*").gt("quantity", 0)

    if (error) throw error

    return { success: true, products: data }
  } catch (error) {
    console.error("Error fetching products:", error)
    return { success: false, products: [], error: error.message }
  }
}
