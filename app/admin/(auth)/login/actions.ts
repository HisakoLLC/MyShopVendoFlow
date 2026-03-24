"use server"

import { supabaseAdmin } from "@/lib/admin/supabase-admin"

interface VerifyAdminResult {
  success: boolean
  error?: string
}

/**
 * Verifies if a user ID exists in the admin.admin_users table.
 * Uses the service role client to bypass schema visibility restrictions.
 */
export async function verifyAdminAccess(userId: string): Promise<VerifyAdminResult> {
  try {
    const { data: adminRecord, error } = await supabaseAdmin
      .schema("admin" as any)
      .from("admin_users")
      .select("id, is_active")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      console.error("Admin verification database error:", error)
      return { success: false, error: "Database verification failed" }
    }

    if (!adminRecord) {
      return { success: false, error: "User is not registered as an administrator" }
    }

    if (!adminRecord.is_active) {
      return { success: false, error: "This administrator account is currently inactive" }
    }

    return { success: true }
  } catch (err) {
    console.error("Unexpected admin verification error:", err)
    return { success: false, error: "An unexpected error occurred during verification" }
  }
}
