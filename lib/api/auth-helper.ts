import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function requireAuth(_req: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    console.warn("[api][auth] unauthorized", { error: error?.message })
    return {
      user: null,
      supabase: null as any,
      error: NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 }),
    }
  }

  return { user, supabase, error: null as NextResponse | null }
}

export async function requireAccountAccess(supabase: any, userId: string) {
  const { data: accountId, error } = await supabase.rpc("get_account_id")

  if (error || !accountId) {
    console.warn("[api][auth] account access denied", { userId, error: error?.message })
    return {
      accountId: null,
      error: NextResponse.json({ error: "Unable to determine account access" }, { status: 403 }),
    }
  }

  return { accountId, error: null as NextResponse | null }
}

export async function requireStaffRole(
  supabase: any,
  userId: string,
  allowedRoles: ("owner" | "manager" | "cashier")[]
) {
  // Check if user is owner via account_members
  const { data: ownerCheck } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (ownerCheck) {
    if (!allowedRoles.includes("owner")) {
      console.warn("[api][auth] insufficient permissions (owner not allowed)", { userId, allowedRoles })
      return {
        role: null,
        error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
      }
    }
    return { role: "owner" as const, assignedStoreId: null as string | null, error: null as NextResponse | null }
  }

  // Check staff role
  const { data: staff } = await supabase
    .from("staff")
    .select("role, assigned_store_id")
    .eq("auth_user_id", userId)
    .eq("active", true)
    .maybeSingle()

  if (!staff || !allowedRoles.includes(staff.role)) {
    console.warn("[api][auth] insufficient permissions", { userId, staffRole: staff?.role, allowedRoles })
    return {
      role: null,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    }
  }

  return { role: staff.role, assignedStoreId: staff.assigned_store_id, error: null as NextResponse | null }
}

