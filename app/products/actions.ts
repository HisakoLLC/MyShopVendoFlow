"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB

const createStyleServerSchema = z.object({
  name: z.string().min(3, "Style name must be at least 3 characters.").max(100).trim(),
  category_id: z.string().uuid("Invalid category ID."),
  season_id: z.string().uuid().nullable().optional(),
  /** When creating a style, season_name is used to find-or-create a season; takes precedence over season_id when provided. */
  season_name: z.string().max(100).trim().nullable().optional(),
  description: z.string().max(500).trim().nullable().optional(),
  base_price: z.number().min(0.01, "Base price must be greater than 0.").max(999999999),
  cost: z.number().min(0.01, "Cost must be greater than 0.").max(999999999),
  // Optional for create; nullable for updates to support "remove image"
  image_url: z.string().min(1).nullable().optional(),
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

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] ?? null : accountIdRaw
  if (accountIdError || accountId == null || accountId === "") {
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

  const accountIdStr = typeof accountId === "string" ? accountId : String(accountId)

  // Resolve season_id: from season_name (find-or-create) or from season_id
  let seasonId: string | null = validated.season_id ?? null
  const seasonNameTrimmed = validated.season_name?.trim()
  if (seasonNameTrimmed) {
    const { data: existing } = await supabase
      .from("seasons")
      .select("season_id")
      .eq("account_id", accountIdStr)
      .ilike("name", seasonNameTrimmed)
      .limit(1)
      .maybeSingle()
    if (existing?.season_id) {
      seasonId = existing.season_id
    } else {
      const { data: created, error: createErr } = await supabase
        .from("seasons")
        .insert({ account_id: accountIdStr, name: seasonNameTrimmed })
        .select("season_id")
        .single()
      if (createErr || !created) {
        throw new Error("Could not save season.")
      }
      seasonId = created.season_id
    }
  } else if (validated.season_id) {
    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("season_id")
      .eq("season_id", validated.season_id)
      .eq("account_id", accountId)
      .single()
    if (seasonError || !season) {
      throw new Error("Invalid season selected.")
    }
    seasonId = validated.season_id
  }

  const payload = {
    account_id: accountIdStr,
    name: validated.name,
    category_id: validated.category_id,
    season_id: seasonId,
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

export async function updateProductStyle(
  styleId: string,
  formData: z.infer<typeof createStyleServerSchema>
) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update a style.")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] ?? null : accountIdRaw
  if (accountIdError || accountId == null || accountId === "") {
    throw new Error("Unable to resolve account.")
  }

  const parsed = createStyleServerSchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed.")
  }

  const { data: validated } = parsed

  if (validated.cost >= validated.base_price) {
    throw new Error("Cost must be less than Base Price.")
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("category_id")
    .eq("category_id", validated.category_id)
    .eq("account_id", accountId)
    .single()

  if (categoryError || !category) {
    throw new Error("Invalid category selected.")
  }

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

  const { data: style, error: styleError } = await supabase
    .from("product_styles")
    .select("style_id")
    .eq("style_id", styleId)
    .eq("account_id", accountId)
    .single()

  if (styleError || !style) {
    throw new Error("Style not found or access denied.")
  }

  const updatePayload: Record<string, unknown> = {
    name: validated.name,
    category_id: validated.category_id,
    season_id: validated.season_id ?? null,
    description: validated.description ?? null,
    base_price: validated.base_price,
    cost: validated.cost,
  }
  // Only update image_url when explicitly provided (including null to remove).
  if (Object.prototype.hasOwnProperty.call(validated, "image_url")) {
    updatePayload.image_url = validated.image_url
  }

  const { error: updateError } = await supabase
    .from("product_styles")
    .update(updatePayload)
    .eq("style_id", styleId)
    .eq("account_id", accountId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath("/products")
  revalidatePath(`/products/${styleId}`)
  revalidatePath(`/products/${styleId}/edit`)
  return { style_id: styleId }
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
  revalidatePath("/inventory")
}

export async function deleteProductStyle(styleId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to delete a product.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Unable to resolve account.")
  }

  const normAccountId = Array.isArray(accountId) ? accountId[0] ?? null : accountId
  if (normAccountId == null || normAccountId === "") {
    throw new Error("Unable to resolve account.")
  }

  const { data: style, error: styleError } = await supabase
    .from("product_styles")
    .select("style_id")
    .eq("style_id", styleId)
    .eq("account_id", normAccountId)
    .single()

  if (styleError || !style) {
    throw new Error("Style not found or access denied.")
  }

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("variant_id")
    .eq("style_id", styleId)

  if (variantsError) {
    throw new Error("Failed to load product variants.")
  }

  const variantIds = (variants ?? []).map((v: { variant_id: string }) => v.variant_id)
  if (variantIds.length > 0) {
    const { data: saleLines } = await supabase
      .from("sale_line_items")
      .select("variant_id")
      .in("variant_id", variantIds)
      .limit(1)
    if (saleLines && saleLines.length > 0) {
      throw new Error("Cannot delete: this product has sales history. Archive it instead.")
    }

    const { data: poLines } = await supabase
      .from("po_line_items")
      .select("variant_id")
      .in("variant_id", variantIds)
      .limit(1)
    if (poLines && poLines.length > 0) {
      throw new Error("Cannot delete: this product is on a purchase order. Remove it from the order first.")
    }
  }

  if (variantIds.length > 0) {
    await supabase.from("inventory_levels").delete().in("variant_id", variantIds)
    await supabase.from("inventory_transfers").delete().in("variant_id", variantIds)
    await supabase.from("variant_metrics").delete().in("variant_id", variantIds)
  }

  const { error: deleteVariantsError } = await supabase
    .from("product_variants")
    .delete()
    .eq("style_id", styleId)

  if (deleteVariantsError) {
    throw new Error(deleteVariantsError.message)
  }

  const { error: deleteStyleError } = await supabase
    .from("product_styles")
    .delete()
    .eq("style_id", styleId)
    .eq("account_id", normAccountId)

  if (deleteStyleError) {
    throw new Error(deleteStyleError.message)
  }

  revalidatePath("/products")
  revalidatePath("/inventory")
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

const variantUpdateSchema = z
  .object({
    sku: z
      .string()
      .min(1, "SKU is required.")
      .regex(/^[A-Z0-9-]+$/, "SKU must contain only uppercase letters, numbers, and hyphens."),
    price: z.number().min(0.01, "Price must be greater than 0."),
    cost: z.number().min(0.01, "Cost must be greater than 0."),
  })
  .refine((data) => data.cost < data.price, {
    message: "Cost must be less than Price.",
    path: ["cost"],
  })

export async function updateProductVariant(
  variantId: string,
  data: z.infer<typeof variantUpdateSchema>
) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update a variant.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Unable to resolve account.")
  }

  const parsed = variantUpdateSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed.")
  }

  const { sku, price, cost } = parsed.data

  // Verify variant belongs to account (via style)
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("variant_id, style_id, sku, product_styles!inner(account_id)")
    .eq("variant_id", variantId)
    .single()

  if (variantError || !variant) {
    throw new Error("Variant not found or access denied.")
  }

  const style = variant.product_styles as { account_id: string } | null
  if (!style || style.account_id !== accountId) {
    throw new Error("Variant not found or access denied.")
  }

  // If SKU is changing, ensure it doesn't conflict with another variant (excluding this one)
  const { data: existingBySku, error: skuError } = await supabase
    .from("product_variants")
    .select("variant_id")
    .eq("sku", sku)
    .neq("variant_id", variantId)
    .limit(1)

  if (skuError) {
    throw new Error("Error checking SKU.")
  }
  if (existingBySku && existingBySku.length > 0) {
    throw new Error(`SKU "${sku}" is already used by another variant.`)
  }

  const { error: updateError } = await supabase
    .from("product_variants")
    .update({ sku, price, cost })
    .eq("variant_id", variantId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath("/inventory")
  revalidatePath("/products")
  revalidatePath(`/products/${variant.style_id}`)
  return { success: true }
}
