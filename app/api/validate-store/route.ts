import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"

/**
 * GET /api/validate-store?store_id=...
 * Returns whether the store exists and is active (for login PIN quick-access).
 * Called unauthenticated from the login page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get("store_id")

  if (!storeId || typeof storeId !== "string") {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  const supabaseUrl = getSupabaseUrl()
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ valid: false }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: store, error } = await supabase
    .from("stores")
    .select("store_id, name, active")
    .eq("store_id", storeId)
    .single()

  if (error || !store) {
    return NextResponse.json({ valid: false })
  }

  if (store.active === false) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({
    valid: true,
    store_name: store.name ?? undefined,
  })
}
