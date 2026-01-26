"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type Tables = Database["public"]["Tables"]
type PurchaseOrderInsert = Tables["purchase_orders"]["Insert"]
type POLineItemInsert = Tables["po_line_items"]["Insert"]
type SupplierInsert = Tables["suppliers"]["Insert"]

export type CreatePOData = {
  supplier_id: string
  order_date: string
  expected_delivery_date: string | null
  notes?: string | null
  line_items: Array<{
    variant_id: string
    quantity_ordered: number
    unit_cost: number
  }>
  status?: "draft" | "sent"
}

export type CreateSupplierData = {
  name: string
  email?: string | null
  phone?: string | null
  payment_terms?: string | null
}

export type ReceiveInventoryData = {
  po_id: string
  store_id: string
  received_date: string
  line_items: Array<{
    line_item_id: string
    quantity: number
  }>
}

/**
 * Generate PO number in format: PO-YYYY-XXXXX
 * Example: PO-2025-00042
 */
async function generatePONumber(accountId: string): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const currentYear = new Date().getFullYear()

  // Find the highest PO number for this year
  const { data: existingPOs, error } = await supabase
    .from("purchase_orders")
    .select("po_number")
    .eq("account_id", accountId)
    .like("po_number", `PO-${currentYear}-%`)
    .order("po_number", { ascending: false })
    .limit(1)

  if (error) {
    console.error("Error fetching existing PO numbers:", error)
    // Fallback: use timestamp-based number
    const timestamp = Date.now().toString().slice(-5)
    return `PO-${currentYear}-${timestamp.padStart(5, "0")}`
  }

  if (!existingPOs || existingPOs.length === 0) {
    // First PO of the year
    return `PO-${currentYear}-00001`
  }

  // Extract the number part and increment
  const lastPONumber = existingPOs[0].po_number
  const match = lastPONumber.match(/PO-\d{4}-(\d+)/)
  if (match) {
    const lastNumber = parseInt(match[1], 10)
    const nextNumber = (lastNumber + 1).toString().padStart(5, "0")
    return `PO-${currentYear}-${nextNumber}`
  }

  // Fallback if pattern doesn't match
  const timestamp = Date.now().toString().slice(-5)
  return `PO-${currentYear}-${timestamp.padStart(5, "0")}`
}

export async function createPurchaseOrder(data: CreatePOData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create a purchase order.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate
  if (!data.supplier_id) {
    throw new Error("Supplier is required.")
  }

  if (!data.line_items || data.line_items.length === 0) {
    throw new Error("At least one line item is required.")
  }

  // Validate line items
  for (const item of data.line_items) {
    if (!item.variant_id) {
      throw new Error("All line items must have a variant selected.")
    }
    if (!item.quantity_ordered || item.quantity_ordered < 1) {
      throw new Error("All line items must have a quantity of at least 1.")
    }
    if (!item.unit_cost || item.unit_cost < 0) {
      throw new Error("All line items must have a valid unit cost.")
    }
  }

  // Generate PO number
  const poNumber = await generatePONumber(accountId)

  // Calculate total cost
  const totalCost = data.line_items.reduce(
    (sum, item) => sum + item.quantity_ordered * item.unit_cost,
    0
  )

  // Create purchase order
  const poInsert: PurchaseOrderInsert = {
    account_id: accountId,
    supplier_id: data.supplier_id,
    po_number: poNumber,
    order_date: data.order_date,
    expected_delivery_date: data.expected_delivery_date || null,
    status: data.status || "draft",
    total_cost: totalCost,
    created_by: user.id,
  }

  const { data: purchaseOrder, error: poError } = await supabase
    .from("purchase_orders")
    .insert(poInsert)
    .select("po_id")
    .single()

  if (poError) {
    console.error("Error creating purchase order:", poError)
    throw new Error(`Failed to create purchase order: ${poError.message}`)
  }

  if (!purchaseOrder) {
    throw new Error("Failed to create purchase order: No data returned.")
  }

  // Create line items
  const lineItems: POLineItemInsert[] = data.line_items.map((item) => ({
    po_id: purchaseOrder.po_id,
    variant_id: item.variant_id,
    quantity_ordered: item.quantity_ordered,
    unit_cost: item.unit_cost,
    line_total: item.quantity_ordered * item.unit_cost,
  }))

  const { error: lineItemsError } = await supabase.from("po_line_items").insert(lineItems)

  if (lineItemsError) {
    console.error("Error creating line items:", lineItemsError)
    // Try to delete the PO if line items fail
    await supabase.from("purchase_orders").delete().eq("po_id", purchaseOrder.po_id)
    throw new Error(`Failed to create line items: ${lineItemsError.message}`)
  }

  revalidatePath("/purchasing")
  return {
    po_id: purchaseOrder.po_id,
    po_number: poNumber,
  }
}

export async function createSupplier(data: CreateSupplierData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create a supplier.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Supplier name is required.")
  }

  const supplierInsert: SupplierInsert = {
    account_id: accountId,
    name: data.name.trim(),
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    payment_terms: data.payment_terms?.trim() || null,
  }

  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .insert(supplierInsert)
    .select("supplier_id, name")
    .single()

  if (supplierError) {
    console.error("Error creating supplier:", supplierError)
    throw new Error(`Failed to create supplier: ${supplierError.message}`)
  }

  if (!supplier) {
    throw new Error("Failed to create supplier: No data returned.")
  }

  revalidatePath("/purchasing")
  return supplier
}

export async function receiveInventory(data: ReceiveInventoryData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to receive inventory.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate
  if (!data.store_id) {
    throw new Error("Destination store is required.")
  }

  if (!data.line_items || data.line_items.length === 0) {
    throw new Error("At least one line item must be received.")
  }

  // Filter out items with quantity 0
  const itemsToReceive = data.line_items.filter((item) => item.quantity > 0)
  if (itemsToReceive.length === 0) {
    throw new Error("At least one line item must have a quantity greater than 0.")
  }

  // Verify PO belongs to account
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("po_id, account_id, status")
    .eq("po_id", data.po_id)
    .eq("account_id", accountId)
    .single()

  if (poError || !po) {
    throw new Error("Purchase order not found or access denied.")
  }

  // Verify store belongs to account
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("store_id", data.store_id)
    .eq("account_id", accountId)
    .single()

  if (storeError || !store) {
    throw new Error("Store not found or access denied.")
  }

  // Fetch line items to validate quantities
  const lineItemIds = itemsToReceive.map((item) => item.line_item_id)
  const { data: lineItems, error: lineItemsError } = await supabase
    .from("po_line_items")
    .select("line_item_id, variant_id, quantity_ordered, quantity_received")
    .in("line_item_id", lineItemIds)
    .eq("po_id", data.po_id)

  if (lineItemsError || !lineItems) {
    throw new Error("Failed to fetch line items.")
  }

  // Validate quantities
  for (const receiveItem of itemsToReceive) {
    const lineItem = lineItems.find((li: { line_item_id: string; variant_id: string | null; quantity_ordered: number; quantity_received: number | null }) => li.line_item_id === receiveItem.line_item_id)
    if (!lineItem) {
      throw new Error(`Line item ${receiveItem.line_item_id} not found.`)
    }

    const qtyReceived = lineItem.quantity_received || 0
    const qtyRemaining = lineItem.quantity_ordered - qtyReceived

    if (receiveItem.quantity > qtyRemaining) {
      throw new Error(
        `Cannot receive more than ordered. Remaining: ${qtyRemaining}, Attempted: ${receiveItem.quantity}`
      )
    }
  }

  // Prepare data for inventory_receipts
  const receiptLineItems = itemsToReceive.map((item) => {
    const lineItem = lineItems.find((li: { line_item_id: string; variant_id: string | null; quantity_ordered: number; quantity_received: number | null }) => li.line_item_id === item.line_item_id)!
    return {
      variant_id: lineItem.variant_id,
      quantity: item.quantity,
    }
  })

  // Update po_line_items.quantity_received
  for (const receiveItem of itemsToReceive) {
    const lineItem = lineItems.find((li: { line_item_id: string; variant_id: string | null; quantity_ordered: number; quantity_received: number | null }) => li.line_item_id === receiveItem.line_item_id)!
    const newQtyReceived = (lineItem.quantity_received || 0) + receiveItem.quantity

    const { error: updateError } = await supabase
      .from("po_line_items")
      .update({ quantity_received: newQtyReceived })
      .eq("line_item_id", receiveItem.line_item_id)

    if (updateError) {
      throw new Error(`Failed to update line item: ${updateError.message}`)
    }
  }

  // Update inventory_levels
  for (const receiveItem of itemsToReceive) {
    const lineItem = lineItems.find((li: { line_item_id: string; variant_id: string | null; quantity_ordered: number; quantity_received: number | null }) => li.line_item_id === receiveItem.line_item_id)!
    if (!lineItem.variant_id) continue

    // Get current inventory level
    const { data: currentLevel, error: levelError } = await supabase
      .from("inventory_levels")
      .select("inventory_id, quantity_on_hand")
      .eq("variant_id", lineItem.variant_id)
      .eq("store_id", data.store_id)
      .single()

    const newQuantity = (currentLevel?.quantity_on_hand || 0) + receiveItem.quantity

    if (currentLevel) {
      // Update existing inventory level
      const { error: updateError } = await supabase
        .from("inventory_levels")
        .update({
          quantity_on_hand: newQuantity,
          last_counted_date: new Date().toISOString(),
        })
        .eq("inventory_id", currentLevel.inventory_id)

      if (updateError) {
        throw new Error(`Failed to update inventory: ${updateError.message}`)
      }
    } else {
      // Create new inventory level
      const { error: insertError } = await supabase.from("inventory_levels").insert({
        variant_id: lineItem.variant_id,
        store_id: data.store_id,
        quantity_on_hand: newQuantity,
        quantity_reserved: 0,
        last_counted_date: new Date().toISOString(),
      })

      if (insertError) {
        throw new Error(`Failed to create inventory level: ${insertError.message}`)
      }
    }
  }

  // Create inventory_receipts record
  const { error: receiptError } = await supabase.from("inventory_receipts").insert({
    po_id: data.po_id,
    store_id: data.store_id,
    received_by: user.id,
    received_date: data.received_date,
    line_items_received: receiptLineItems,
  })

  if (receiptError) {
    throw new Error(`Failed to create receipt record: ${receiptError.message}`)
  }

  // Check if all line items are fully received
  const { data: allLineItems, error: allLineItemsError } = await supabase
    .from("po_line_items")
    .select("quantity_ordered, quantity_received")
    .eq("po_id", data.po_id)

  if (!allLineItemsError && allLineItems) {
    const allFullyReceived = allLineItems.every(
      (item: { quantity_ordered: number; quantity_received: number | null }) => (item.quantity_received || 0) >= item.quantity_ordered
    )

    // Update PO status
    const newStatus = allFullyReceived ? "received" : "partially_received"
    const { error: statusError } = await supabase
      .from("purchase_orders")
      .update({ status: newStatus })
      .eq("po_id", data.po_id)

    if (statusError) {
      console.error("Error updating PO status:", statusError)
      // Don't throw - receipt was successful, status update is secondary
    }
  }

  revalidatePath(`/purchasing/${data.po_id}`)
  revalidatePath("/purchasing")
  revalidatePath("/inventory")
  return { success: true }
}
