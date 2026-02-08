"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { logAuditEvent, getIpAddress, getUserAgent } from "@/lib/audit/logger"

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

  // Resolve account_id: check if user is staff (has auth_user_id in staff table), otherwise owner
  const { data: staffRecord } = await supabase
    .from("staff")
    .select("account_id, staff_id, active")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  let accountId: string | null = null
  let processedBy: string | null = null

  if (staffRecord) {
    if (!staffRecord.active) {
      return { success: false, error: "Your staff account is deactivated." }
    }
    accountId = staffRecord.account_id
    processedBy = staffRecord.staff_id
  } else {
    // Owner: get from account_members via get_account_id RPC
    const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
    accountId = Array.isArray(accountIdRaw)
      ? accountIdRaw[0]
      : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
        ? (accountIdRaw as { account_id: string }).account_id
        : accountIdRaw
    if (accountIdError || !accountId) {
      return { success: false, error: "Unable to resolve account." }
    }
  }

  const accountIdStr = accountId != null ? String(accountId) : null
  if (!accountIdStr) {
    return { success: false, error: "Unable to resolve account." }
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

    if (lineError) {
      console.error("SALE LINE ITEMS ERROR:", lineError)
      return { success: false, error: lineError.message }
    }
    
    if (!lineItems || lineItems.length === 0) {
      return { success: false, error: "No line items found for this sale." }
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

  // Log refund event (server action - no request headers available)
  await logAuditEvent({
    account_id: accountIdStr,
    user_id: user.id,
    staff_id: processedBy || undefined,
    action_type: "sale_refunded",
    entity_type: "sale",
    entity_id: sale_id,
    old_values: { status: sale.status },
    new_values: { status: "refunded", refund_amount: refundAmount },
    metadata: {
      refund_method: refund_method,
      refund_id: refundId,
    },
  })

  revalidatePath("/sales")
  revalidatePath("/inventory")
  return { success: true, refund_id: refundId }
}
