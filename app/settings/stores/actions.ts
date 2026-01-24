"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"

const storeSchema = z.object({
  name: z.string().min(1, "Store name is required.").max(200, "Name is too long."),
  address: z.string().max(500, "Address is too long.").optional(),
  tax_rate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative.")
    .max(100, "Tax rate cannot exceed 100%.")
    .optional(),
  timezone: z.string().max(100, "Timezone is too long.").optional(),
  active: z.boolean().optional(),
})

export type CreateStoreData = z.infer<typeof storeSchema>
export type UpdateStoreData = z.infer<typeof storeSchema> & { store_id: string }

export async function createStore(data: CreateStoreData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create a store.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate input
  const parsed = storeSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed.")
  }

  // Check plan limits
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("plan_tier")
    .eq("account_id", accountId)
    .single()

  if (accountError) {
    throw new Error("Failed to check account plan.")
  }

  const planTier = account?.plan_tier || "starter"
  const limits: Record<string, number> = {
    starter: 1,
    core: 3,
    scale: 10,
  }
  const maxStores = limits[planTier] || 1

  // Count existing stores
  const { data: existingStores, error: countError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("account_id", accountId)

  if (countError) {
    throw new Error("Failed to check store count.")
  }

  if ((existingStores?.length || 0) >= maxStores) {
    throw new Error(
      `Store limit reached. ${planTier === "starter" ? "Upgrade to Core" : "Upgrade to Scale"} to add more stores.`
    )
  }

  // Create store
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      account_id: accountId,
      name: parsed.data.name.trim(),
      address: parsed.data.address?.trim() || null,
      tax_rate: parsed.data.tax_rate || null,
      timezone: parsed.data.timezone?.trim() || null,
      active: parsed.data.active ?? true,
    })
    .select("store_id, name")
    .single()

  if (storeError) {
    throw new Error(`Failed to create store: ${storeError.message}`)
  }

  revalidatePath("/settings/stores")
  return store
}

export async function updateStore(data: UpdateStoreData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update a store.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate input
  const parsed = storeSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed.")
  }

  // Verify store belongs to account
  const { data: existingStore, error: verifyError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("store_id", data.store_id)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !existingStore) {
    throw new Error("Store not found or access denied.")
  }

  // Update store
  const { error: updateError } = await supabase
    .from("stores")
    .update({
      name: parsed.data.name.trim(),
      address: parsed.data.address?.trim() || null,
      tax_rate: parsed.data.tax_rate || null,
      timezone: parsed.data.timezone?.trim() || null,
      active: parsed.data.active ?? true,
    })
    .eq("store_id", data.store_id)

  if (updateError) {
    throw new Error(`Failed to update store: ${updateError.message}`)
  }

  revalidatePath("/settings/stores")
  return { success: true }
}

export async function deactivateStore(storeId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to deactivate a store.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify store belongs to account
  const { data: store, error: verifyError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("store_id", storeId)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !store) {
    throw new Error("Store not found or access denied.")
  }

  // Update store to inactive
  const { error: updateError } = await supabase
    .from("stores")
    .update({ active: false })
    .eq("store_id", storeId)

  if (updateError) {
    throw new Error(`Failed to deactivate store: ${updateError.message}`)
  }

  revalidatePath("/settings/stores")
  return { success: true }
}
