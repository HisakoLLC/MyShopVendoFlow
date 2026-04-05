import { NextResponse } from "next/server"
import { requireFinance, adminDb, logActivity } from "@/lib/admin/billing-helpers"

export async function GET(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireFinance()
    if (errorResponse) return errorResponse

    const { data, error } = await adminDb()
      .from("finance_transactions")
      .select(`
        *,
        accounts:merchant_id ( business_name )
      `)
      .order("transaction_date", { ascending: false })

    if (error) {
      console.error("[finance_transactions] GET error:", error)
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireFinance()
    if (errorResponse) return errorResponse

    const body = await req.json()
    
    // Log the payload to debug any missing fields
    console.log("[finance_transactions] POST body:", body)

    const { data, error } = await adminDb()
      .from("finance_transactions")
      .insert({
        amount: body.amount,
        type: body.type,
        merchant_id: body.merchantId || null,
        transaction_date: body.transactionDate || new Date().toISOString().split("T")[0],
        notes: body.notes || "",
        created_by: adminUser.id
      })
      .select()
      .single()

    if (error) {
      console.error("[finance_transactions] Insert failed:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally log activity if applicable
    await logActivity(adminUser, "payment_recorded", "finance_transaction", data.id, {
      amount: data.amount,
      type: data.type
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[finance_transactions] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

