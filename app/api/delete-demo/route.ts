import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { clearDemoData } from "@/scripts/clear-demo-data"

/**
 * POST /api/delete-demo
 * Deletes all demo data for the current user's account (sales, products, customers, etc.).
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

    await clearDemoData(supabase, accountId)

    return NextResponse.json({ success: true, message: "All demo data has been removed." })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete demo data"
    console.error("Delete demo error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
