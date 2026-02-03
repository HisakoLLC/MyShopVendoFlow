"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

const processRefundSchema = z.object({
  sale_id: z.string().uuid(),
  refund_method: z.enum(["cash", "mpesa", "card"]),
})

export type ProcessRefundResult = { success: true; refund_id: string } | { success: false; error: string }

export async function processRefund(
  input: z.infer<typeof processRefundSchema>
): Promise<ProcessRefundResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be signed in to process a refund." }
  }

  const parsed = processRefundSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
  }

  const { sale_id, refund_method } = parsed.data

  // Resolve account: staff (PIN login) use user_metadata.account_id; owner use get_account_id
  const accountIdFromMeta = user.user_metadata?.account_id as string | undefined
  const accountIdRaw = await supabase.rpc("get_account_id")
  const accountIdFromRpc = Array.isArray(accountIdRaw)
    ? accountIdRaw[0]
    : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  const accountId = accountIdFromMeta ?? accountIdFromRpc ?? null
  const accountIdStr = accountId != null ? String(accountId) : null
  if (!accountIdStr) {
    return { success: false, error: "Unable to resolve account." }
  }

  // Resolve staff_id for processed_by (prefer user_metadata from PIN login)
  let processedBy: string | null = (user.user_metadata?.staff_id as string) ?? null
  if (!processedBy && user.email) {
    const { data: staffRow } = await supabase
      .from("staff")
      .select("staff_id")
      .eq("account_id", accountIdStr)
      .ilike("email", user.email.trim())
      .eq("active", true)
      .limit(1)
      .maybeSingle()
    processedBy = staffRow?.staff_id ?? null
  }

  // Fetch sale and ensure it belongs to account (via store)
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("sale_id, store_id, grand_total, customer_id, status")
    .eq("sale_id", sale_id)
    .single()

  if (saleError || !sale?.store_id) {
    return { success: false, error: "Sale not found." }
  }

  const { data: store } = await supabase
    .from("stores")
    .select("store_id")
    .eq("store_id", sale.store_id)
    .eq("account_id", accountIdStr)
    .single()

  if (!store) {
    return { success: false, error: "Sale does not belong to your account." }
  }

  if (sale.status === "refunded") {
    return { success: false, error: "This sale has already been refunded." }
  }

  // Existing refunds for this sale (e.g. partial in future)
  const { data: existingRefunds } = await supabase
    .from("refunds")
    .select("refund_id")
    .eq("sale_id", sale_id)

  const totalRefunded = existingRefunds?.length ?? 0
  if (totalRefunded > 0) {
    return { success: false, error: "This sale already has a refund recorded." }
  }

  const refundAmount = sale.grand_total ?? 0
  if (refundAmount <= 0) {
    return { success: false, error: "Sale total is zero; nothing to refund." }
  }

  // Fetch line items
  const { data: lineItems, error: lineError } = await supabase
    .from("sale_line_items")
    .select("line_item_id, variant_id, quantity, unit_price, line_total")
    .eq("sale_id", sale_id)

  if (lineError || !lineItems?.length) {
    return { success: false, error: "Could not load sale line items." }
  }

  const refundedLineItems = lineItems.map((item: { line_item_id: string; variant_id: string | null; quantity: number | null; unit_price: number; line_total: number }) => ({
    line_item_id: item.line_item_id,
    variant_id: item.variant_id,
    quantity: item.quantity ?? 0,
    unit_price: item.unit_price,
    line_total: item.line_total,
  }))

  const refundId = uuidv4()

  const { error: insertRefundError } = await supabase.from("refunds").insert({
    refund_id: refundId,
    sale_id,
    refund_amount: refundAmount,
    refund_date: new Date().toISOString(),
    refund_method: refund_method,
    refunded_line_items: refundedLineItems,
    processed_by: processedBy,
  })

  if (insertRefundError) {
    return { success: false, error: insertRefundError.message }
  }

  // Restore inventory for each line item at the sale's store
  for (const item of lineItems) {
    const variantId = item.variant_id
    const qty = item.quantity ?? 0
    if (!variantId || qty <= 0) continue

    const { data: inv } = await supabase
      .from("inventory_levels")
      .select("inventory_id, quantity_on_hand")
      .eq("variant_id", variantId)
      .eq("store_id", sale.store_id)
      .single()

    const newQty = (inv?.quantity_on_hand ?? 0) + qty

    if (inv) {
      await supabase
        .from("inventory_levels")
        .update({ quantity_on_hand: newQty })
        .eq("inventory_id", inv.inventory_id)
    } else {
      await supabase.from("inventory_levels").insert({
        variant_id: variantId,
        store_id: sale.store_id,
        quantity_on_hand: newQty,
        quantity_reserved: 0,
      })
    }
  }

  // Update customer stats if sale had a customer
  if (sale.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("total_spend, transaction_count")
      .eq("customer_id", sale.customer_id)
      .single()

    if (customer) {
      const newTotalSpend = Math.max(0, (customer.total_spend ?? 0) - refundAmount)
      const newTransactionCount = Math.max(0, (customer.transaction_count ?? 1) - 1)
      await supabase
        .from("customers")
        .update({
          total_spend: newTotalSpend,
          transaction_count: newTransactionCount,
        })
        .eq("customer_id", sale.customer_id)
    }
  }

  // Mark sale as refunded
  await supabase
    .from("sales")
    .update({ status: "refunded" })
    .eq("sale_id", sale_id)

  revalidatePath("/sales")
  revalidatePath("/inventory")
  return { success: true, refund_id: refundId }
}
