"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSignedStorageUrl } from "@/lib/signed-storage-url"
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

/** Sign Supabase storage URLs for client-displayed images (private buckets). */
export async function signStorageUrls(
  urls: (string | null | undefined)[]
): Promise<(string | null)[]> {
  if (!urls || urls.length === 0) return []
  const supabase = await createServerSupabaseClient()
  return Promise.all(
    urls.map((url) => (url ? getSignedStorageUrl(supabase, url) : Promise.resolve(null)))
  )
}

/**
 * Generate a safe PO number in format: PO-YYYY-XXXXX
 * Example: PO-2026-00001
 */
async function generatePONumber(accountId: string): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient()
    const currentYear = new Date().getFullYear()

    const { data: existingPOs, error } = await supabase
      .from("purchase_orders")
      .select("po_number")
      .eq("account_id", accountId)
      .like("po_number", `PO-${currentYear}-%`)
      .order("po_number", { ascending: false })
      .limit(1)

    console.log("generatePONumber existingPOs:", existingPOs, "error:", error)

    if (error) throw error

    if (!existingPOs || existingPOs.length === 0) {
      return `PO-${currentYear}-00001`
    }

    const lastPONumber = existingPOs[0].po_number
    const match = lastPONumber.match(/PO-\d{4}-(\d+)/)
    if (match) {
      const lastNumber = parseInt(match[1], 10)
      const nextNumber = (lastNumber + 1).toString().padStart(5, "0")
      return `PO-${currentYear}-${nextNumber}`
    }

    return `PO-${currentYear}-00001`
  } catch (err) {
    console.error("Failed to generate PO number:", err)
    const timestamp = Date.now().toString().slice(-5)
    return `PO-${new Date().getFullYear()}-${timestamp.padStart(5, "0")}`
  }
}

/** Create a new purchase order with line items */
export async function createPurchaseOrder(data: CreatePOData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error("You must be signed in to create a purchase order.")

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountIdRaw) throw new Error("Account not found. Please complete setup first.")
  const accountId = typeof accountIdRaw === "string" ? accountIdRaw : accountIdRaw?.account_id
  if (!accountId) throw new Error("Invalid account ID returned.")

  // Validation
  if (!data.supplier_id) throw new Error("Supplier is required.")
  if (!data.line_items || data.line_items.length === 0) throw new Error("At least one line item is required.")

  for (const item of data.line_items) {
    if (!item.variant_id) throw new Error("All line items must have a variant selected.")
    if (!item.quantity_ordered || item.quantity_ordered < 1) throw new Error("All line items must have a quantity of at least 1.")
    if (item.unit_cost == null || item.unit_cost < 0) throw new Error("All line items must have a valid unit cost.")
  }

  const poNumber = await generatePONumber(accountId)
  const totalCost = data.line_items.reduce((sum, item) => sum + item.quantity_ordered * item.unit_cost, 0)

  const poInsert: PurchaseOrderInsert = {
    account_id: accountId,
    supplier_id: data.supplier_id,
    po_number: poNumber,
    order_date: data.order_date,
    expected_delivery_date: data.expected_delivery_date || null,
    status: data.status || "draft",
    total_cost: totalCost,
    created_by: null,
  }

  const { data: purchaseOrder, error: poError } = await supabase
    .from("purchase_orders")
    .insert(poInsert)
    .select("po_id")
    .single()

  if (poError || !purchaseOrder) {
    console.error("Error creating purchase order:", poError)
    throw new Error(`Failed to create purchase order: ${poError?.message || "No data returned"}`)
  }

  const lineItems: POLineItemInsert[] = data.line_items.map((item) => ({
    po_id: purchaseOrder.po_id,
    variant_id: item.variant_id,
    quantity_ordered: item.quantity_ordered,
    unit_cost: item.unit_cost,
    line_total: item.quantity_ordered * item.unit_cost,
  }))

  const { error: lineItemsError } = await supabase.from("po_line_items").insert(lineItems)
  if (lineItemsError) {
    await supabase.from("purchase_orders").delete().eq("po_id", purchaseOrder.po_id)
    throw new Error(`Failed to create line items: ${lineItemsError.message}`)
  }

  revalidatePath("/purchasing")
  return { po_id: purchaseOrder.po_id, po_number: poNumber }
}

/** Create a new supplier */
export async function createSupplier(data: CreateSupplierData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error("You must be signed in to create a supplier.")

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountIdRaw) throw new Error("Account not found. Please complete setup first.")
  const accountId = typeof accountIdRaw === "string" ? accountIdRaw : accountIdRaw?.account_id
  if (!accountId) throw new Error("Invalid account ID returned.")

  if (!data.name || !data.name.trim()) throw new Error("Supplier name is required.")

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

  if (supplierError || !supplier) {
    console.error("Error creating supplier:", supplierError)
    throw new Error(`Failed to create supplier: ${supplierError?.message || "No data returned"}`)
  }

  revalidatePath("/purchasing")
  revalidatePath("/purchasing/suppliers")
  return supplier
}

/** Update an existing supplier */
export async function updateSupplier(supplierId: string, data: CreateSupplierData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error("You must be signed in to update a supplier.")

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountIdRaw) throw new Error("Account not found. Please complete setup first.")
  const accountId = typeof accountIdRaw === "string" ? accountIdRaw : accountIdRaw?.account_id
  if (!accountId) throw new Error("Invalid account ID returned.")

  if (!data.name || !data.name.trim()) throw new Error("Supplier name is required.")

  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .update({
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      payment_terms: data.payment_terms?.trim() || null,
    })
    .eq("supplier_id", supplierId)
    .eq("account_id", accountId) // extra safety
    .select("supplier_id, name")
    .single()

  if (supplierError || !supplier) {
    console.error("Error updating supplier:", supplierError)
    throw new Error(`Failed to update supplier: ${supplierError?.message || "No data returned"}`)
  }

  revalidatePath("/purchasing")
  revalidatePath("/purchasing/suppliers")
  return supplier
}

/** Delete a supplier */
export async function deleteSupplier(supplierId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error("You must be signed in to delete a supplier.")

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountIdRaw) throw new Error("Account not found. Please complete setup first.")
  const accountId = typeof accountIdRaw === "string" ? accountIdRaw : accountIdRaw?.account_id
  if (!accountId) throw new Error("Invalid account ID returned.")

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("supplier_id", supplierId)
    .eq("account_id", accountId)

  if (error) {
    console.error("Error deleting supplier:", error)
    if (error.code === "23503") {
      throw new Error("Cannot delete supplier with existing purchase orders.")
    }
    throw new Error(`Failed to delete supplier: ${error.message}`)
  }

  revalidatePath("/purchasing")
  revalidatePath("/purchasing/suppliers")
  return { success: true }
}

/** Receive inventory for a PO */
export async function receiveInventory(data: ReceiveInventoryData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("You must be signed in to receive inventory.")

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountIdRaw) throw new Error("Account not found. Please complete setup first.")
  const accountId = typeof accountIdRaw === "string" ? accountIdRaw : accountIdRaw?.account_id
  if (!accountId) throw new Error("Invalid account ID returned.")

 
  // Update po_line_items.quantity_received
  // Filter items to receive
const itemsToReceive = data.line_items.filter(item => item.quantity > 0)
if (itemsToReceive.length === 0) throw new Error("No items to receive")

// Fetch line items from DB
const lineItemIds = itemsToReceive.map(i => i.line_item_id)
const { data: lineItems, error: lineItemsError } = await supabase
  .from("po_line_items")
  .select("line_item_id, variant_id, quantity_ordered, quantity_received")
  .in("line_item_id", lineItemIds)
  .eq("po_id", data.po_id)

if (lineItemsError || !lineItems) throw new Error("Failed to fetch line items")

// Prepare line items for inventory_receipts table
if (!lineItems || lineItems.length === 0) throw new Error("Line items not found for this PO")

  const receiptLineItems = itemsToReceive.map(item => {
    const li = lineItems.find(
      (l: { line_item_id: string; variant_id: string | null }) => l.line_item_id === item.line_item_id
    )
  
    if (!li) throw new Error(`Line item not found: ${item.line_item_id}`)
  
    return {
      variant_id: li.variant_id,
      quantity: item.quantity,
    }
  })
  
  
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

  // Create inventory_receipts record (received_by is FK to staff; use null if user not in staff)
  const { error: receiptError } = await supabase.from("inventory_receipts").insert({
    po_id: data.po_id,
    store_id: data.store_id,
    received_by: null,
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

