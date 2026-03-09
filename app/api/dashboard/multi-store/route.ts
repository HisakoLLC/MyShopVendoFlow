import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { StaffRole } from "@/lib/auth/roles"
import { getMultiStoreDashboardData, parsePeriod } from "@/lib/dashboard/multi-store"

function normalizeAccountId(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === "string") return raw.trim() || null
  if (Array.isArray(raw)) {
    const first = raw[0]
    return typeof first === "string" ? first.trim() || null : first != null ? String(first).trim() || null : null
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const v = obj.account_id
    if (typeof v === "string") return v.trim() || null
    if (v != null) return String(v).trim() || null
  }
  return String(raw).trim() || null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 })
    }

    let role: StaffRole = "owner"
    let accountId: string | null = null

    const { data: staffRow, error: staffError } = await supabase
      .from("staff")
      .select("role, account_id, active")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    if (staffRow) {
      if (staffRow.active === false) {
        return NextResponse.json({ error: "Staff account deactivated" }, { status: 403 })
      }
      if (staffRow.role === "cashier" || staffRow.role === "manager" || staffRow.role === "owner") {
        role = staffRow.role
      } else {
        role = "cashier"
      }
      if (staffRow.account_id) accountId = String(staffRow.account_id).trim() || null
    }

    if (role === "cashier") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!accountId) {
      const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
      if (accountIdError) {
        return NextResponse.json({ error: accountIdError.message }, { status: 500 })
      }
      accountId = normalizeAccountId(accountIdRaw)
    }

    if (!accountId) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const period = parsePeriod(searchParams.get("period"))

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("store_id, name")
      .eq("account_id", accountId)
      .order("name", { ascending: true })

    if (storesError) {
      return NextResponse.json({ error: storesError.message }, { status: 500 })
    }

    const storeRows = (stores || []) as Array<{ store_id: string | null; name: string | null }>
    const storeList: Array<{ store_id: string; name: string }> = storeRows
      .filter(
        (s): s is { store_id: string; name: string | null } =>
          typeof s.store_id === "string" && s.store_id.trim().length > 0
      )
      .map((s) => ({ store_id: s.store_id, name: s.name ?? "" }))

    if (storeList.length === 0) {
      return NextResponse.json({
        aggregated: { total_revenue: 0, total_transactions: 0, avg_basket: 0, period },
        by_store: [],
        daily_revenue: [],
      })
    }

    const storeIds = storeList.map((s) => s.store_id)
    const storeNameById = new Map<string, string>(storeList.map((s) => [s.store_id, s.name]))
    const data = await getMultiStoreDashboardData({
      supabase,
      storeIds,
      storeNameById,
      period,
    })

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load multi-store dashboard data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

