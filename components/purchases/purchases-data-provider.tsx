"use server"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Get Supabase URL and service role key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export type Purchase = {
  id: string
  reference_number: string
  purchase_date: string
  total_amount: number
  notes: string | null
  supplier_id: string | null
  supplier_name?: string
  created_at: string
  updated_at: string
}

export type PurchaseItem = {
  id: string
  purchase_id: string
  product_id: string
  product_name?: string
  product_sku?: string
  quantity: number
  unit_cost: number
  total_cost: number
}

export async function getPurchasesData() {
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

    const { data, error } = await supabase
      .from("purchases")
      .select(`
        *,
        suppliers (
          id,
          name
        )
      `)
      .order("purchase_date", { ascending: false })

    if (error) {
      throw error
    }

    // Transform data to match the Purchase type
    const purchases: Purchase[] = data.map((purchase) => ({
      id: purchase.id,
      reference_number: purchase.reference_number,
      purchase_date: purchase.purchase_date,
      total_amount: purchase.total_amount,
      notes: purchase.notes,
      supplier_id: purchase.supplier_id,
      supplier_name: purchase.suppliers?.name || "Unknown Supplier",
      created_at: purchase.created_at,
      updated_at: purchase.updated_at,
    }))

    return purchases
  } catch (error) {
    console.error("Error fetching purchases data:", error)
    return []
  }
}

export async function getPurchaseById(id: string) {
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

    // Get purchase details
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .select(`
        *,
        suppliers (
          id,
          name
        )
      `)
      .eq("id", id)
      .single()

    if (purchaseError) {
      throw purchaseError
    }

    // Get purchase items
    const { data: items, error: itemsError } = await supabase
      .from("purchase_items")
      .select(`
        *,
        products (
          id,
          name,
          sku
        )
      `)
      .eq("purchase_id", id)

    if (itemsError) {
      throw itemsError
    }

    // Transform purchase items
    const purchaseItems: PurchaseItem[] = items.map((item) => ({
      id: item.id,
      purchase_id: item.purchase_id,
      product_id: item.product_id,
      product_name: item.products?.name || "Unknown Product",
      product_sku: item.products?.sku || "",
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total_cost: item.total_cost,
    }))

    return {
      purchase: {
        id: purchase.id,
        reference_number: purchase.reference_number,
        purchase_date: purchase.purchase_date,
        total_amount: purchase.total_amount,
        notes: purchase.notes,
        supplier_id: purchase.supplier_id,
        supplier_name: purchase.suppliers?.name || "Unknown Supplier",
        created_at: purchase.created_at,
        updated_at: purchase.updated_at,
      },
      items: purchaseItems,
    }
  } catch (error) {
    console.error("Error fetching purchase details:", error)
    return null
  }
}

export async function deletePurchase(id: string) {
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

    // First, get the purchase items to restore product quantities
    const { data: purchaseItems, error: itemsError } = await supabase
      .from("purchase_items")
      .select("product_id, quantity")
      .eq("purchase_id", id)

    if (itemsError) {
      throw itemsError
    }

    // Restore product quantities (decrease since purchases increase inventory)
    for (const item of purchaseItems || []) {
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
          quantity: product.quantity - item.quantity, // Decrease quantity
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.product_id)

      if (updateError) {
        throw updateError
      }
    }

    // Delete purchase items
    const { error: deleteItemsError } = await supabase.from("purchase_items").delete().eq("purchase_id", id)

    if (deleteItemsError) {
      throw deleteItemsError
    }

    // Delete the purchase
    const { error: deletePurchaseError } = await supabase.from("purchases").delete().eq("id", id)

    if (deletePurchaseError) {
      throw deletePurchaseError
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting purchase:", error)
    return { success: false, error }
  }
}
