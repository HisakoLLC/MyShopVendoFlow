import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { seedDemoData } from "@/scripts/seed-demo-data"

/**
 * POST /api/seed-demo
 * Loads demo data (products, customers, sales, etc.) for the current user's account.
 * Requires at least one store. Idempotent; safe to call again (adds more demo data or updates flag).
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: accountId, error: accountError } = await supabase.rpc("get_account_id")
    if (accountError || !accountId) {
      return NextResponse.json(
        { error: "Account not found. Complete onboarding first." },
        { status: 400 }
      )
    }

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("store_id")
      .eq("account_id", accountId)
      .limit(1)

    if (storesError || !stores?.length) {
      return NextResponse.json(
        { error: "No store found. Complete onboarding first." },
        { status: 400 }
      )
    }

    const storeId = stores[0].store_id
    await seedDemoData(accountId, storeId)

    return NextResponse.json({ success: true, message: "Demo data loaded successfully" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load demo data"
    console.error("Seed demo error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
