import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * GET /api/current-store
 * Returns the current user's first store and account_id (for persisting to localStorage
 * so staff can use 4-digit PIN login on this device). Requires authentication.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || accountIdRaw == null) {
    return NextResponse.json({ error: "No account" }, { status: 404 })
  }

  const accountId =
    typeof accountIdRaw === "string"
      ? accountIdRaw
      : Array.isArray(accountIdRaw)
        ? accountIdRaw[0]
        : typeof accountIdRaw === "object" &&
            accountIdRaw !== null &&
            "account_id" in accountIdRaw
          ? (accountIdRaw as { account_id: string }).account_id
          : String(accountIdRaw)
  const accountIdStr = accountId != null ? String(accountId).trim() : ""
  if (!accountIdStr) {
    return NextResponse.json({ error: "No account" }, { status: 404 })
  }

  // Single store per account; include rows where active is true or null
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountIdStr)
    .order("name", { ascending: true })
    .limit(1)

  if (storesError || !stores || stores.length === 0) {
    return NextResponse.json({ error: "No store" }, { status: 404 })
  }

  const store = stores[0]
  return NextResponse.json({
    store_id: store.store_id,
    store_name: store.name ?? "",
    account_id: accountIdStr,
  })
}
