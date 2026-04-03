/**
 * lib/admin/billing-helpers.ts
 *
 * Shared utilities for all admin billing API routes.
 * Keeps each route file thin and consistent.
 */

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser, type AdminUser } from "@/lib/admin/auth"

// ---------------------------------------------------------------------------
// Schema alias — the live database schema name
// ---------------------------------------------------------------------------
export const ADMIN_SCHEMA = "vendo_admin" as const

// Typed shorthand to avoid the repeated cast everywhere
export const adminDb = () => supabaseAdmin.schema(ADMIN_SCHEMA as any)

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

/** Any authenticated admin */
export async function requireAdmin(): Promise<
  { adminUser: AdminUser; errorResponse: null } |
  { adminUser: null; errorResponse: NextResponse }
> {
  const adminUser = await getServerAdminUser()
  if (!adminUser) {
    return {
      adminUser: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { adminUser, errorResponse: null }
}

/** finance or super_admin */
export async function requireFinance(): Promise<
  { adminUser: AdminUser; errorResponse: null } |
  { adminUser: null; errorResponse: NextResponse }
> {
  const result = await requireAdmin()
  if (result.errorResponse) return result
  const { adminUser } = result
  if (!["super_admin", "finance"].includes(adminUser.role)) {
    return {
      adminUser: null,
      errorResponse: NextResponse.json(
        { error: "Permission denied: finance or super_admin required" },
        { status: 403 }
      ),
    }
  }
  return { adminUser, errorResponse: null }
}

/** super_admin only */
export async function requireSuperAdmin(): Promise<
  { adminUser: AdminUser; errorResponse: null } |
  { adminUser: null; errorResponse: NextResponse }
> {
  const result = await requireAdmin()
  if (result.errorResponse) return result
  const { adminUser } = result
  if (adminUser.role !== "super_admin") {
    return {
      adminUser: null,
      errorResponse: NextResponse.json(
        { error: "Permission denied: super_admin required" },
        { status: 403 }
      ),
    }
  }
  return { adminUser, errorResponse: null }
}

// ---------------------------------------------------------------------------
// Activity log writer
// ---------------------------------------------------------------------------
export async function logActivity(
  adminUser: AdminUser,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await (adminDb().from("activity_log") as any).insert({
      admin_user_id: adminUser.id,
      action,
      entity_type: entityType,
      entity_id:   entityId,
      metadata,
    })
  } catch (err) {
    // Non-fatal — log but don't surface to caller
    console.error("[billing-helpers] activity_log write failed:", err)
  }
}
