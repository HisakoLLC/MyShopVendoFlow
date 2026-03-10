"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const storeProfileSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(1, "Store name is required.").max(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  logo_url: z.string().url("Logo URL must be a valid URL.").optional(),
  logo_on_receipt: z.boolean().optional(),
})

export type StoreProfileData = z.infer<typeof storeProfileSchema>

export async function updateStoreProfile(
  data: StoreProfileData
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be signed in to update a store." }
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId =
    typeof accountIdRaw === "string"
      ? accountIdRaw
      : Array.isArray(accountIdRaw)
        ? accountIdRaw[0]
        : accountIdRaw && typeof accountIdRaw === "object" && "account_id" in accountIdRaw
          ? (accountIdRaw as { account_id: string }).account_id
          : null

  if (accountIdError || !accountId) {
    return { success: false, error: "Account not found. Please complete setup first." }
  }

  const parsed = storeProfileSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed.",
    }
  }

  // Verify store belongs to account
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("store_id", parsed.data.store_id)
    .eq("account_id", accountId)
    .maybeSingle()

  if (storeError || !store) {
    return { success: false, error: "Store not found or access denied." }
  }

  const { error: updateError } = await supabase
    .from("stores")
    .update({
      name: parsed.data.name.trim(),
      address: parsed.data.address?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      logo_url: parsed.data.logo_url?.trim() || null,
      logo_on_receipt: parsed.data.logo_on_receipt ?? null,
    })
    .eq("store_id", parsed.data.store_id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

