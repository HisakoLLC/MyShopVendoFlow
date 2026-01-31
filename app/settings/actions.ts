"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

const businessProfileSchema = z.object({
  business_name: z.string().min(1, "Business name is required.").max(200),
  business_address: z.string().max(500).optional(),
  business_phone: z.string().max(50).optional(),
  tax_id: z.string().max(100).optional(),
})

const receiptSettingsSchema = z.object({
  logo_on_receipt: z.boolean().optional(),
  receipt_header: z.string().max(500).optional(),
  receipt_footer: z.string().max(500).optional(),
  return_policy: z.string().max(1000).optional(),
  currency: z.string().min(1).max(10).optional(),
  tax_inclusive: z.boolean().optional(),
})

const taxRateSchema = z.object({
  store_id: z.string().uuid(),
  tax_rate: z.number().min(0).max(100).optional(),
})

export type BusinessProfileData = z.infer<typeof businessProfileSchema>
export type ReceiptSettingsData = z.infer<typeof receiptSettingsSchema>
export type TaxRateData = z.infer<typeof taxRateSchema>

/**
 * Upload logo to Supabase Storage
 * Note: This is a server action that accepts FormData
 */
export async function uploadLogo(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to upload logo.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  const file = formData.get("file") as File | null
  if (!file) {
    throw new Error("No file provided.")
  }

  // Validate file size (200KB max)
  if (file.size > 200 * 1024) {
    throw new Error("File size must be less than 200KB.")
  }

  // Validate file type
  const validTypes = ["image/png", "image/jpeg", "image/jpg"]
  if (!validTypes.includes(file.type)) {
    throw new Error("File must be PNG or JPG.")
  }

  // Convert File to ArrayBuffer for server-side upload
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const filePath = `${accountId}/${uuidv4()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("business-logos")
    .upload(filePath, buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    throw new Error(`Logo upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const { data: publicData } = supabase.storage.from("business-logos").getPublicUrl(filePath)

  // Update business_settings with logo_url
  const { data: existingSettings } = await supabase
    .from("business_settings")
    .select("account_id")
    .eq("account_id", accountId)
    .single()

  const settingsData = {
    account_id: accountId,
    logo_url: publicData.publicUrl,
  }

  if (existingSettings) {
    await supabase.from("business_settings").update(settingsData).eq("account_id", accountId)
  } else {
    await supabase.from("business_settings").insert(settingsData)
  }

  revalidatePath("/settings")
  return { logo_url: publicData.publicUrl }
}

/**
 * Update business profile
 */
export async function updateBusinessProfile(data: BusinessProfileData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update business profile.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate
  const parsed = businessProfileSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Validation failed.")
  }

  // Update accounts table
  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      business_name: parsed.data.business_name.trim(),
    })
    .eq("account_id", accountId)

  if (updateError) {
    throw new Error(`Failed to update business profile: ${updateError.message}`)
  }

  // Update or insert business_settings (singleton)
  // First try to get existing settings
  const { data: existingSettings } = await supabase
    .from("business_settings")
    .select("account_id")
    .eq("account_id", accountId)
    .single()

  const settingsData = {
    account_id: accountId,
    business_address: parsed.data.business_address?.trim() || null,
    business_phone: parsed.data.business_phone?.trim() || null,
    tax_id: parsed.data.tax_id?.trim() || null,
  }

  if (existingSettings) {
    // Update existing
    const { error: settingsError } = await supabase
      .from("business_settings")
      .update(settingsData)
      .eq("account_id", accountId)

    if (settingsError) {
      throw new Error(`Failed to update settings: ${settingsError.message}`)
    }
  } else {
    // Insert new
    const { error: insertError } = await supabase
      .from("business_settings")
      .insert(settingsData)

    if (insertError) {
      throw new Error(`Failed to create settings: ${insertError.message}`)
    }
  }

  revalidatePath("/settings")
  return { success: true }
}

/**
 * Update receipt customization settings
 */
export async function updateReceiptSettings(data: ReceiptSettingsData & { logo_url?: string }) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update receipt settings.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate
  const parsed = receiptSettingsSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Validation failed.")
  }

  // Update or insert business_settings
  const { data: existingSettings } = await supabase
    .from("business_settings")
    .select("account_id")
    .eq("account_id", accountId)
    .single()

  const settingsData: any = {
    account_id: accountId,
    logo_on_receipt: parsed.data.logo_on_receipt ?? null,
    receipt_header: parsed.data.receipt_header?.trim() || null,
    receipt_footer: parsed.data.receipt_footer?.trim() || null,
    return_policy: parsed.data.return_policy?.trim() || null,
    currency: parsed.data.currency?.trim() || "KES",
    tax_inclusive: parsed.data.tax_inclusive ?? false,
  }

  if (data.logo_url) {
    settingsData.logo_url = data.logo_url
  }

  if (existingSettings) {
    const { error: updateError } = await supabase
      .from("business_settings")
      .update(settingsData)
      .eq("account_id", accountId)

    if (updateError) {
      throw new Error(`Failed to update receipt settings: ${updateError.message}`)
    }
  } else {
    const { error: insertError } = await supabase
      .from("business_settings")
      .insert(settingsData)

    if (insertError) {
      throw new Error(`Failed to create receipt settings: ${insertError.message}`)
    }
  }

  revalidatePath("/settings")
  return { success: true }
}

/**
 * Update store tax rate
 */
export async function updateStoreTaxRate(data: TaxRateData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update tax rates.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate
  const parsed = taxRateSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Validation failed.")
  }

  // Verify store belongs to account
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("store_id")
    .eq("store_id", parsed.data.store_id)
    .eq("account_id", accountId)
    .single()

  if (storeError || !store) {
    throw new Error("Store not found or access denied.")
  }

  // Update tax rate
  const { error: updateError } = await supabase
    .from("stores")
    .update({
      tax_rate: parsed.data.tax_rate ?? null,
    })
    .eq("store_id", parsed.data.store_id)

  if (updateError) {
    throw new Error(`Failed to update tax rate: ${updateError.message}`)
  }

  revalidatePath("/settings")
  return { success: true }
}

/** Normalize get_account_id() result to a string. */
function toAccountId(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === "string") return raw || null
  if (Array.isArray(raw)) return raw[0] != null ? String(raw[0]) : null
  if (typeof raw === "object" && raw !== null && "account_id" in raw) return String((raw as { account_id: unknown }).account_id) || null
  return String(raw) || null
}

/**
 * Request account deletion. Marks the account as deleted and revokes access.
 * Data is retained for 90 days; user can request a copy before then.
 */
export async function requestAccountDeletion(): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be signed in." }
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = toAccountId(accountIdRaw)
  if (accountIdError || !accountId) {
    return { success: false, error: "Account not found." }
  }

  const { data: member, error: memberError } = await supabase
    .from("account_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .maybeSingle()

  if (memberError || !member || member.role !== "owner") {
    return { success: false, error: "Only the account owner can delete the account." }
  }

  const purgeAt = new Date()
  purgeAt.setDate(purgeAt.getDate() + 90)

  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      subscription_status: "deleted",
      trial_ends_at: purgeAt.toISOString(),
    })
    .eq("account_id", accountId)

  if (updateError) {
    return { success: false, error: `Failed to mark account for deletion: ${updateError.message}` }
  }

  const { error: deleteMembersError } = await supabase
    .from("account_members")
    .delete()
    .eq("account_id", accountId)

  if (deleteMembersError) {
    return { success: false, error: `Failed to revoke access: ${deleteMembersError.message}` }
  }

  revalidatePath("/", "layout")
  return { success: true }
}
