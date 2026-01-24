import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * M-Pesa STK Push Callback Webhook
 * Receives payment confirmation from M-Pesa after customer completes payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // M-Pesa callback structure
    const stkCallback = body.Body?.stkCallback
    if (!stkCallback) {
      console.error("Invalid callback structure:", body)
      return NextResponse.json(
        { ResultCode: 0, ResultDesc: "Accepted" },
        { status: 200 }
      )
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback

    console.log("M-Pesa Callback received:", {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    })

    // Find pending payment record
    const supabase = await createServerSupabaseClient()
    const { data: pendingPayment, error: pendingError } = await supabase
      .from("pending_mpesa_payments")
      .select("sale_id, amount, phone_number")
      .eq("checkout_request_id", CheckoutRequestID)
      .single()

    if (pendingError || !pendingPayment) {
      console.error("Pending payment not found for CheckoutRequestID:", CheckoutRequestID)
      // Still return 200 to acknowledge receipt
      return NextResponse.json(
        { ResultCode: 0, ResultDesc: "Accepted" },
        { status: 200 }
      )
    }

    // Extract payment details from callback metadata
    let mpesaReceiptNumber: string | null = null
    let transactionDate: string | null = null
    let phoneNumber: string | null = null
    let amount: number | null = null

    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case "MpesaReceiptNumber":
            mpesaReceiptNumber = item.Value
            break
          case "TransactionDate":
            transactionDate = item.Value
            break
          case "PhoneNumber":
            phoneNumber = item.Value
            break
          case "Amount":
            amount = item.Value
            break
        }
      }
    }

    // Update pending payment status
    const updateData: any = {
      status: ResultCode === "0" ? "completed" : "failed",
      updated_at: new Date().toISOString(),
    }

    if (ResultCode === "0" && mpesaReceiptNumber) {
      updateData.mpesa_receipt_number = mpesaReceiptNumber
    }

    await (supabase as any)
      .from("pending_mpesa_payments")
      .update(updateData)
      .eq("checkout_request_id", CheckoutRequestID)

    // If payment successful, update sale record
    if (ResultCode === "0") {
      // Get sale record
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("sale_id, status, store_id")
        .eq("sale_id", pendingPayment.sale_id)
        .single()

      if (!saleError && sale && (sale as any).status === "pending_payment") {
        // Update sale to completed
        const { error: updateSaleError } = await (supabase as any)
          .from("sales")
          .update({
            status: "completed",
            payment_method: "mpesa",
            mpesa_transaction_id: mpesaReceiptNumber,
            mpesa_phone_number: phoneNumber,
          })
          .eq("sale_id", sale.sale_id)

        if (updateSaleError) {
          console.error("Failed to update sale:", updateSaleError)
        } else {
          // Decrement inventory (if not already done)
          const { data: lineItems, error: lineItemsError } = await supabase
            .from("sale_line_items")
            .select("variant_id, quantity")
            .eq("sale_id", sale.sale_id)

          if (!lineItemsError && lineItems) {
            for (const item of lineItems) {
              const { data: inventory, error: invError } = await supabase
                .from("inventory_levels")
                .select("inventory_id, quantity_on_hand")
                .eq("variant_id", item.variant_id)
                .eq("store_id", sale.store_id)
                .single()

              if (!invError && inventory) {
                const newQuantity = Math.max(
                  0,
                  (inventory.quantity_on_hand || 0) - item.quantity
                )
                await supabase
                  .from("inventory_levels")
                  .update({ quantity_on_hand: newQuantity })
                  .eq("inventory_id", inventory.inventory_id)
              }
            }
          }

          // Update customer stats
          const { data: saleWithCustomer, error: saleCustError } = await supabase
            .from("sales")
            .select("customer_id, grand_total")
            .eq("sale_id", sale.sale_id)
            .single()

          if (!saleCustError && saleWithCustomer?.customer_id) {
            const { data: customer, error: custError } = await supabase
              .from("customers")
              .select("total_spend, transaction_count, first_purchase_date")
              .eq("customer_id", saleWithCustomer.customer_id)
              .single()

            if (!custError && customer) {
              const newTotalSpend = (customer.total_spend || 0) + (saleWithCustomer.grand_total || 0)
              const newTransactionCount = (customer.transaction_count || 0) + 1
              const firstPurchaseDate = customer.first_purchase_date || new Date().toISOString()

              await supabase
                .from("customers")
                .update({
                  total_spend: newTotalSpend,
                  transaction_count: newTransactionCount,
                  last_purchase_date: new Date().toISOString(),
                  first_purchase_date: firstPurchaseDate,
                })
                .eq("customer_id", saleWithCustomer.customer_id)
            }
          }

          console.log("Sale completed successfully:", {
            sale_id: sale.sale_id,
            mpesa_receipt: mpesaReceiptNumber,
          })
        }
      }
    } else {
      // Payment failed - mark sale as failed
      const { error: updateSaleError } = await (supabase as any)
        .from("sales")
        .update({
          status: "failed",
        })
        .eq("sale_id", pendingPayment.sale_id)
        .eq("status", "pending_payment")

      console.log("Payment failed:", {
        sale_id: pendingPayment.sale_id,
        reason: ResultDesc,
      })
    }

    // Always return 200 OK to acknowledge receipt (even if internal processing fails)
    return NextResponse.json(
      { ResultCode: 0, ResultDesc: "Accepted" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error)
    // Still return 200 to acknowledge receipt
    return NextResponse.json(
      { ResultCode: 0, ResultDesc: "Accepted" },
      { status: 200 }
    )
  }
}
