import { NextRequest, NextResponse } from "next/server"
import type { StaffRole } from "@/lib/auth/roles"
import { getMultiStoreDashboardData, parsePeriod } from "@/lib/dashboard/multi-store"
import { requireAccountAccess, requireAuth, requireStaffRole } from "@/lib/api/auth-helper"

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
    const { user, supabase, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { role, error: roleError } = await requireStaffRole(supabase, user!.id, ["owner", "manager"])
    if (roleError) return roleError
    const _role: StaffRole = role

    const { accountId: accountIdRaw, error: accountError } = await requireAccountAccess(supabase, user!.id)
    if (accountError) return accountError
    const accountId = normalizeAccountId(accountIdRaw)
    if (!accountId) {
      console.warn("[api][dashboard][multi-store] account not found", { userId: user!.id, role: _role })
      return NextResponse.json({ error: "Account not found" }, { status: 403 })
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

