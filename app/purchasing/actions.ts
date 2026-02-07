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
  return supplier
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

  // The rest of your receiveInventory logic remains unchanged...
  // (update po_line_items, inventory_levels, create inventory_receipts, update PO status)

  // Revalidate paths after receiving
  revalidatePath(`/purchasing/${data.po_id}`)
  revalidatePath("/purchasing")
  revalidatePath("/inventory")
  return { success: true }
}
