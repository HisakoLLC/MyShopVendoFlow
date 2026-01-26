"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB

const createStyleServerSchema = z.object({
  name: z.string().min(3, "Style name must be at least 3 characters.").max(100).trim(),
  category_id: z.string().uuid("Invalid category ID."),
  season_id: z.string().uuid().nullable().optional(),
  description: z.string().max(500).trim().nullable().optional(),
  base_price: z.number().min(0.01, "Base price must be greater than 0.").max(999999999),
  cost: z.number().min(0.01, "Cost must be greater than 0.").max(999999999),
  image_url: z.string().url().optional(),
})

export async function createProductStyle(formData: z.infer<typeof createStyleServerSchema>) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create a style.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Unable to resolve account.")
  }

  // Server-side validation
  const parsed = createStyleServerSchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed.")
  }

  const { data: validated } = parsed

  // Validate cost < base_price
  if (validated.cost >= validated.base_price) {
    throw new Error("Cost must be less than Base Price.")
  }

  // Verify category belongs to account
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("category_id")
    .eq("category_id", validated.category_id)
    .eq("account_id", accountId)
    .single()

  if (categoryError || !category) {
    throw new Error("Invalid category selected.")
  }

  // Verify season belongs to account (if provided)
  if (validated.season_id) {
    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("season_id")
      .eq("season_id", validated.season_id)
      .eq("account_id", accountId)
      .single()

    if (seasonError || !season) {
      throw new Error("Invalid season selected.")
    }
  }

  const payload = {
    account_id: accountId,
    name: validated.name,
    category_id: validated.category_id,
    season_id: validated.season_id ?? null,
    description: validated.description ?? null,
    base_price: validated.base_price,
    cost: validated.cost,
    image_url: validated.image_url ?? "/placeholder-product.png",
    archived: false,
  }

  const { data, error } = await supabase
    .from("product_styles")
    .insert(payload)
    .select("style_id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/products")
  return { style_id: data.style_id }
}

export async function archiveProductStyle(styleId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to archive a product.")
  }

  // Prefer the database helper if available; it should use auth.uid() internally.
  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")

  if (accountIdError || !accountId) {
    throw new Error("Unable to resolve account.")
  }

  const { error: archiveError } = await supabase
    .from("product_styles")
    .update({ archived: true })
    .eq("style_id", styleId)
    .eq("account_id", accountId)

  if (archiveError) {
    throw new Error(archiveError.message)
  }

  revalidatePath("/products")
}

const variantInsertSchema = z.object({
  style_id: z.string().uuid(),
  size: z.string().min(1),
  color: z.string().min(1),
  sku: z.string().min(1),
  price: z.number().min(0.01),
  cost: z.number().min(0.01),
})

export async function createProductVariants(
  styleId: string,
  variants: z.infer<typeof variantInsertSchema>[]
) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create variants.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Unable to resolve account.")
  }

  // Verify style belongs to account
  const { data: style, error: styleError } = await supabase
    .from("product_styles")
    .select("style_id, base_price, cost")
    .eq("style_id", styleId)
    .eq("account_id", accountId)
    .single()

  if (styleError || !style) {
    throw new Error("Style not found or access denied.")
  }

  // Validate all variants
  const validatedVariants = variants.map((v) => {
    const parsed = variantInsertSchema.safeParse({ ...v, style_id: styleId })
    if (!parsed.success) {
      throw new Error(`Invalid variant: ${parsed.error.errors[0]?.message}`)
    }
    return parsed.data
  })

  // Check for duplicate SKUs
  const skus = validatedVariants.map((v) => v.sku)
  const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index)
  if (duplicateSkus.length > 0) {
    throw new Error(`Duplicate SKUs found: ${duplicateSkus.join(", ")}`)
  }

  // Check for existing SKUs in database
  const { data: existingVariants, error: checkError } = await supabase
    .from("product_variants")
    .select("sku")
    .in("sku", skus)

  if (checkError) {
    throw new Error(`Error checking existing SKUs: ${checkError.message}`)
  }

  if (existingVariants && existingVariants.length > 0) {
    const existingSkus = existingVariants.map((v: { sku: string }) => v.sku).join(", ")
    throw new Error(`SKU(s) already exist: ${existingSkus}. Please use unique SKUs.`)
  }

  // Check for duplicate size/color combinations for this style
  const { data: existingCombos, error: comboError } = await supabase
    .from("product_variants")
    .select("size, color")
    .eq("style_id", styleId)

  if (comboError) {
    throw new Error(`Error checking existing combinations: ${comboError.message}`)
  }

  const existingSet = new Set(
    (existingCombos ?? []).map((c: { size: string; color: string }) => `${c.size}-${c.color}`.toLowerCase())
  )
  const duplicates = validatedVariants.filter((v) =>
    existingSet.has(`${v.size}-${v.color}`.toLowerCase())
  )

  if (duplicates.length > 0) {
    const dupList = duplicates.map((d: { size: string; color: string }) => `${d.size}/${d.color}`).join(", ")
    throw new Error(`Size/color combinations already exist: ${dupList}`)
  }

  // Batch insert variants
  const payload = validatedVariants.map((v) => ({
    style_id: styleId,
    size: v.size,
    color: v.color,
    sku: v.sku,
    price: v.price,
    cost: v.cost,
    barcode: null,
    color_image_url: null,
  }))

  const { data, error } = await supabase.from("product_variants").insert(payload).select("variant_id")

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/products/${styleId}`)
  revalidatePath("/products")
  return { count: data.length, variant_ids: data.map((v: { variant_id: string }) => v.variant_id) }
}

