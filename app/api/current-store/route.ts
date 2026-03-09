import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { StaffRole } from "@/lib/auth/roles"

/**
 * GET /api/current-store
 * Returns the current user's store context:
 * - current_store: selected store (based on preferred_store_id, staff assignment, or first store)
 * - all_stores: all stores for the user's account
 * - account_id: current account
 * - role: resolved staff role (owner/manager/cashier)
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  // Resolve role: staff get role from DB, otherwise owner
  let role: StaffRole = "owner"
  const { data: staffRow } = await supabase
    .from("staff")
    .select("role, assigned_store_id")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle()
  if (staffRow?.role === "cashier" || staffRow?.role === "manager" || staffRow?.role === "owner") {
    role = staffRow.role
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || accountIdRaw == null) {
    return NextResponse.json({ role, store_id: null, store_name: null, account_id: null })
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
    return NextResponse.json({
      current_store: null,
      all_stores: [],
      account_id: null,
      role,
      assigned_store_id: staffRow?.assigned_store_id ?? null,
    })
  }

  const { searchParams } = new URL(request.url)
  const preferredStoreId = searchParams.get("preferred_store_id")

  // All stores for this account, ordered by name
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_id, name")
    .eq("account_id", accountIdStr)
    .order("name", { ascending: true })

  if (storesError || !stores || stores.length === 0) {
    return NextResponse.json({
      current_store: null,
      all_stores: [],
      account_id: accountIdStr,
      role,
      assigned_store_id: staffRow?.assigned_store_id ?? null,
    })
  }

  // Determine current_store:
  // 1) preferred_store_id from query if valid
  // 2) staff.assigned_store_id if present and still valid
  // 3) first store in list
  let current = null as { store_id: string; name: string } | null

  const storeRows = (stores || []) as Array<{ store_id: string; name: string | null }>

  if (preferredStoreId && storeRows.some((s) => s.store_id === preferredStoreId)) {
    const s = storeRows.find((st) => st.store_id === preferredStoreId)!
    current = { store_id: s.store_id, name: s.name ?? "" }
  } else if (
    staffRow?.assigned_store_id &&
    storeRows.some((s) => s.store_id === staffRow.assigned_store_id)
  ) {
    const s = storeRows.find((st) => st.store_id === staffRow.assigned_store_id)!
    current = { store_id: s.store_id, name: s.name ?? "" }
  } else {
    const s = storeRows[0]
    current = { store_id: s.store_id, name: s.name ?? "" }
  }

  return NextResponse.json({
    current_store: current,
    all_stores: storeRows.map((s) => ({
      store_id: s.store_id,
      name: s.name ?? "",
    })),
    account_id: accountIdStr,
    role,
    assigned_store_id: staffRow?.assigned_store_id ?? null,
  })
}
