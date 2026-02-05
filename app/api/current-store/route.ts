import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { StaffRole } from "@/lib/auth/roles"

/**
 * GET /api/current-store
 * Returns the current user's role and optionally store/account (for sidebar and PIN login).
 * Always returns 200 with `role` when authenticated so the sidebar shows the correct nav.
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

  // Resolve role first so client always gets it (staff from DB, otherwise owner)
  let role: StaffRole = "owner"
  const { data: staffRow } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle()
  if (staffRow?.role === "cashier" || staffRow?.role === "manager" || staffRow?.role === "owner") {
    role = staffRow.role
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || accountIdRaw == null) {
    return NextResponse.json({ role, error: "No account" }, { status: 200 })
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
    return NextResponse.json({ role, error: "No account" }, { status: 200 })
  }

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountIdStr)
    .order("name", { ascending: true })
    .limit(1)

  if (storesError || !stores || stores.length === 0) {
    return NextResponse.json({ role, account_id: accountIdStr, error: "No store" }, { status: 200 })
  }

  const store = stores[0]
  return NextResponse.json({
    store_id: store.store_id,
    store_name: store.name ?? "",
    account_id: accountIdStr,
    role,
  })
}
