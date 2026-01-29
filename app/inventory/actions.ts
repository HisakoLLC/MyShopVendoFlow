"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"

const adjustmentSchema = z.object({
  variant_id: z.string().uuid(),
  store_id: z.string().uuid(),
  adjustment: z.number().int().refine((val) => val !== 0, "Adjustment cannot be zero."),
  reason: z.string().min(1).max(200),
})

const bulkAdjustmentSchema = z.object({
  variant_ids: z.array(z.string().uuid()).min(1, "Select at least one variant."),
  store_id: z.string().uuid(),
  adjustmentType: z.enum(["add", "remove", "set"]),
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or more."),
  reason: z.string().min(1).max(200),
})

const transferSchema = z.object({
  from_store_id: z.string().uuid(),
  to_store_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  notes: z.string().max(500).optional(),
})

export async function createInventoryAdjustment(
  data: z.infer<typeof adjustmentSchema>
) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to adjust inventory.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Unable to resolve account.")
  }

  // Validate input
  const parsed = adjustmentSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed.")
  }

  const { variant_id, store_id, adjustment, reason } = parsed.data

  // Verify variant belongs to account
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("variant_id, product_styles!inner(account_id)")
    .eq("variant_id", variant_id)
    .single()

  if (variantError || !variant) {
    throw new Error("Variant not found or access denied.")
  }

  // Verify store belongs to account
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("store_id", store_id)
    .eq("account_id", accountId)
    .single()

  if (storeError || !store) {
    throw new Error("Store not found or access denied.")
  }

  // Get current inventory level
  const { data: currentLevel, error: levelError } = await supabase
    .from("inventory_levels")
    .select("inventory_id, quantity_on_hand")
    .eq("variant_id", variant_id)
    .eq("store_id", store_id)
    .single()

  const newQuantity = (currentLevel?.quantity_on_hand ?? 0) + adjustment

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
      throw new Error(updateError.message)
    }
  } else {
    // Create new inventory level
    const { error: insertError } = await supabase.from("inventory_levels").insert({
      variant_id,
      store_id,
      quantity_on_hand: newQuantity,
      quantity_reserved: 0,
      last_counted_date: new Date().toISOString(),
    })

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  // TODO: Log adjustment to audit table if you have one
  // For now, we'll just update the inventory

  revalidatePath("/inventory")
  return { success: true, newQuantity }
}

export type BulkAdjustmentData = z.infer<typeof bulkAdjustmentSchema>

export async function createBulkInventoryAdjustment(data: BulkAdjustmentData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to adjust inventory.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Unable to resolve account.")
  }

  const parsed = bulkAdjustmentSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed.")
  }

  const { variant_ids, store_id, adjustmentType, quantity, reason } = parsed.data

  // Verify store belongs to account
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("store_id", store_id)
    .eq("account_id", accountId)
    .single()

  if (storeError || !store) {
    throw new Error("Store not found or access denied.")
  }

  // Fetch current inventory levels for all variants at this store
  const { data: levels, error: levelsError } = await supabase
    .from("inventory_levels")
    .select("inventory_id, variant_id, quantity_on_hand")
    .in("variant_id", variant_ids)
    .eq("store_id", store_id)

  if (levelsError) {
    throw new Error(levelsError.message)
  }

  const levelByVariant = new Map(
    (levels ?? []).map((l: { variant_id: string; inventory_id: string; quantity_on_hand: number | null }) => [
      l.variant_id,
      { inventory_id: l.inventory_id, quantity_on_hand: l.quantity_on_hand ?? 0 },
    ])
  )

  let updated = 0
  let inserted = 0

  for (const variant_id of variant_ids) {
    const current = levelByVariant.get(variant_id)
    const currentQty = current?.quantity_on_hand ?? 0

    let newQuantity: number
    if (adjustmentType === "add") {
      newQuantity = currentQty + quantity
    } else if (adjustmentType === "remove") {
      newQuantity = Math.max(0, currentQty - quantity)
    } else {
      newQuantity = quantity
    }

    if (current) {
      const { error: updateError } = await supabase
        .from("inventory_levels")
        .update({
          quantity_on_hand: newQuantity,
          last_counted_date: new Date().toISOString(),
        })
        .eq("inventory_id", current.inventory_id)

      if (!updateError) updated++
      else throw new Error(updateError.message)
    } else {
      const { error: insertError } = await supabase.from("inventory_levels").insert({
        variant_id,
        store_id,
        quantity_on_hand: newQuantity,
        quantity_reserved: 0,
        last_counted_date: new Date().toISOString(),
      })
      if (!insertError) inserted++
      else throw new Error(insertError.message)
    }
  }

  revalidatePath("/inventory")
  return { success: true, updated, inserted }
}

export type CreateTransferData = z.infer<typeof transferSchema>

export async function createInventoryTransfer(data: CreateTransferData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create a transfer.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate input
  const parsed = transferSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed.")
  }

  const { from_store_id, to_store_id, variant_id, quantity, notes } = parsed.data

  // Cannot transfer to same store
  if (from_store_id === to_store_id) {
    throw new Error("Cannot transfer to the same store.")
  }

  // Verify stores belong to account
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id")
    .in("store_id", [from_store_id, to_store_id])
    .eq("account_id", accountId)

  if (storesError || !stores || stores.length !== 2) {
    throw new Error("One or both stores not found or access denied.")
  }

  // Verify variant belongs to account
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("variant_id, product_styles!inner(account_id)")
    .eq("variant_id", variant_id)
    .single()

  if (variantError || !variant) {
    throw new Error("Variant not found or access denied.")
  }

  // Check available stock at from_store
  const { data: fromInventory, error: inventoryError } = await supabase
    .from("inventory_levels")
    .select("quantity_on_hand")
    .eq("variant_id", variant_id)
    .eq("store_id", from_store_id)
    .single()

  const availableStock = fromInventory?.quantity_on_hand || 0

  if (quantity > availableStock) {
    throw new Error(
      `Cannot transfer more than available stock. Available: ${availableStock}, Requested: ${quantity}`
    )
  }

  // Create transfer with status='pending'
  const { data: transfer, error: transferError } = await supabase
    .from("inventory_transfers")
    .insert({
      from_store_id,
      to_store_id,
      variant_id,
      quantity,
      status: "pending",
      created_by: user.id,
      created_date: new Date().toISOString(),
    })
    .select("transfer_id")
    .single()

  if (transferError) {
    throw new Error(`Failed to create transfer: ${transferError.message}`)
  }

  revalidatePath("/inventory/transfers")
  revalidatePath("/inventory/transfer")
  return { success: true, transfer_id: transfer.transfer_id }
}

export async function completeInventoryTransfer(transferId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to complete a transfer.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Fetch transfer
  const { data: transfer, error: transferError } = await supabase
    .from("inventory_transfers")
    .select(
      `
      transfer_id,
      from_store_id,
      to_store_id,
      variant_id,
      quantity,
      status,
      stores!inventory_transfers_from_store_id_fkey(account_id),
      stores!inventory_transfers_to_store_id_fkey(account_id)
    `
    )
    .eq("transfer_id", transferId)
    .single()

  if (transferError || !transfer) {
    throw new Error("Transfer not found.")
  }

  // Verify stores belong to account
  const fromStore = transfer.stores as unknown as { account_id: string } | null
  const toStore = transfer.stores as unknown as { account_id: string } | null

  if (!fromStore || !toStore || fromStore.account_id !== accountId || toStore.account_id !== accountId) {
    throw new Error("Transfer stores do not belong to your account.")
  }

  if (transfer.status === "completed") {
    throw new Error("This transfer has already been completed.")
  }

  if (!transfer.variant_id || !transfer.from_store_id || !transfer.to_store_id) {
    throw new Error("Transfer is missing required information.")
  }

  // Decrement inventory at from_store
  const { data: fromInventory, error: fromInventoryError } = await supabase
    .from("inventory_levels")
    .select("inventory_id, quantity_on_hand")
    .eq("variant_id", transfer.variant_id)
    .eq("store_id", transfer.from_store_id)
    .single()

  if (fromInventoryError && fromInventoryError.code !== "PGRST116") {
    throw new Error(`Failed to fetch source inventory: ${fromInventoryError.message}`)
  }

  const fromCurrentStock = fromInventory?.quantity_on_hand || 0
  const fromNewStock = fromCurrentStock - transfer.quantity

  if (fromNewStock < 0) {
    throw new Error(
      `Insufficient stock at source store. Current: ${fromCurrentStock}, Required: ${transfer.quantity}`
    )
  }

  if (fromInventory) {
    const { error: updateFromError } = await supabase
      .from("inventory_levels")
      .update({
        quantity_on_hand: fromNewStock,
        last_counted_date: new Date().toISOString(),
      })
      .eq("inventory_id", fromInventory.inventory_id)

    if (updateFromError) {
      throw new Error(`Failed to update source inventory: ${updateFromError.message}`)
    }
  } else {
    throw new Error("Source store has no inventory for this variant.")
  }

  // Increment inventory at to_store
  const { data: toInventory, error: toInventoryError } = await supabase
    .from("inventory_levels")
    .select("inventory_id, quantity_on_hand")
    .eq("variant_id", transfer.variant_id)
    .eq("store_id", transfer.to_store_id)
    .single()

  const toCurrentStock = toInventory?.quantity_on_hand || 0
  const toNewStock = toCurrentStock + transfer.quantity

  if (toInventory) {
    const { error: updateToError } = await supabase
      .from("inventory_levels")
      .update({
        quantity_on_hand: toNewStock,
        last_counted_date: new Date().toISOString(),
      })
      .eq("inventory_id", toInventory.inventory_id)

    if (updateToError) {
      throw new Error(`Failed to update destination inventory: ${updateToError.message}`)
    }
  } else {
    // Create new inventory level
    const { error: insertToError } = await supabase.from("inventory_levels").insert({
      variant_id: transfer.variant_id,
      store_id: transfer.to_store_id,
      quantity_on_hand: toNewStock,
      quantity_reserved: 0,
      last_counted_date: new Date().toISOString(),
    })

    if (insertToError) {
      throw new Error(`Failed to create destination inventory: ${insertToError.message}`)
    }
  }

  // Update transfer status
  const { error: updateTransferError } = await supabase
    .from("inventory_transfers")
    .update({
      status: "completed",
      completed_date: new Date().toISOString(),
    })
    .eq("transfer_id", transferId)

  if (updateTransferError) {
    throw new Error(`Failed to update transfer status: ${updateTransferError.message}`)
  }

  revalidatePath("/inventory/transfers")
  revalidatePath("/inventory")
  return { success: true }
}
