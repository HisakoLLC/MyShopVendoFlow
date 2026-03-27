import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"

export async function GET(req: Request) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const merchantId = searchParams.get("merchantId")

    if (!merchantId) {
      return NextResponse.json({ error: "Missing merchantId" }, { status: 400 })
    }

    // 1. Fetch Account Info
    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("account_id", merchantId)
      .single()

    if (accountError) {
      console.error("[MERCHANT_CONTEXT_ACCOUNT_ERROR]", accountError)
      return NextResponse.json({ error: accountError.message }, { status: 500 })
    }

    // 2. Fetch Stores
    const { data: stores, error: storesError } = await supabaseAdmin
      .from("stores")
      .select("store_id, name, active")
      .eq("account_id", merchantId)

    const storeIds = (stores || []).map(s => s.store_id)

    // 3. Aggregate Revenue
    const { data: sales, error: salesError } = await supabaseAdmin
      .from("sales")
      .select("grand_total")
      .in("store_id", storeIds.length > 0 ? storeIds : ["-1"]) 

    const totalRevenue = sales?.reduce((acc, sale) => acc + (Number(sale.grand_total) || 0), 0) || 0

    return NextResponse.json({
      merchant: {
        ...account,
        stores: stores || [],
        totalRevenue,
        orderCount: sales?.length || 0
      }
    })
  } catch (error: any) {
    console.error("[MERCHANT_CONTEXT_CRASH]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
