import { cookies } from "next/headers"
import { supabaseAdmin } from "./supabase-admin"

export type AdminUser = {
  id: string
  email: string
  full_name: string
  role: "super_admin" | "support" | "finance" | "reporting"
  avatar_url: string | null
}

/**
 * Retrieves the currently authenticated admin user from the custom session cookie.
 * This is the primary server-side auth guard for all /api/admin routes.
 */
export async function getServerAdminUser(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("vendoflow_admin_session")?.value

    if (!sessionId) {
      console.warn("[AUTH] No admin session cookie found")
      return null
    }

    // Basic structure check for UUID-like session token
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(sessionId)) {
      console.warn("[AUTH] Invalid admin session format")
      return null
    }

    // Verify the session and get admin data via secure RPC
    const { data: sessionInfo, error: sessionError } = await (supabaseAdmin
      .rpc as any)("get_admin_session_data", {
        p_session_id: sessionId
      })

    if (sessionError || !sessionInfo) {
      console.error("[AUTH] Failed to validate admin session:", sessionError)
      return null
    }

    return {
      id: sessionInfo.id,
      email: sessionInfo.email,
      full_name: sessionInfo.full_name,
      role: sessionInfo.role as AdminUser["role"],
      avatar_url: sessionInfo.avatar_url ?? null,
    }
  } catch (error) {
    console.error("[AUTH] Unexpected error in getServerAdminUser:", error)
    return null
  }
}
