"use server"

import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

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
      .schema("vendo_admin" as any)
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

import { getSupabaseServiceRoleKey } from "@/lib/supabase/env"

/**
 * Custom sign-in for administrators that bypasses GoTrue/Supabase Auth service.
 * Used as a workaround for the 'Database error querying schema' infrastructure issue.
 */
export async function signInAdmin(email: string, pass: string): Promise<VerifyAdminResult> {
  console.log(`[AUTH_DEBUG] Attempting sign-in for: ${email}`)
  try {
    const serviceRoleKey = getSupabaseServiceRoleKey()
    if (!serviceRoleKey) {
      console.error("[AUTH_DEBUG] Critical: SUPABASE_SERVICE_ROLE_KEY is missing in environment")
      return { 
        success: false, 
        error: "Server Configuration Error: Missing Service Role Key. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel environment variables." 
      }
    }

    const supabase = supabaseAdmin
    const cookieStore = await cookies()

    // 1. Call the secure RPC that handles verification and session creation
    // This bypasses PostgREST schema visibility restrictions.
    const { data: sessionId, error: rpcError } = await (supabase
      .rpc as any)("authenticate_admin", {
        p_email: email,
        p_password: pass
      })

    if (rpcError) {
      console.error("[AUTH_DEBUG] RPC Authentication Error:", rpcError)
      // Map common PG exceptions to user-friendly messages
      const msg = rpcError.message || ""
      if (msg.includes("Invalid email or password")) {
        return { success: false, error: "Invalid email or password" }
      }
      if (msg.includes("Account not authorized")) {
        return { success: false, error: "Account not authorized for admin console" }
      }
      if (msg.includes("Administrator account is inactive")) {
        return { success: false, error: "Administrator account is inactive" }
      }
      
      return { success: false, error: `Authentication Error: ${rpcError.message}` }
    }

    if (!sessionId) {
      console.error("[AUTH_DEBUG] Authentication failed: No session ID returned")
      return { success: false, error: "Authentication failed. Please try again." }
    }

    console.log("[AUTH_DEBUG] RPC Authentication successful. Setting cookie...")

    // 2. Set the session cookie
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days session

    cookieStore.set("vendoflow_admin_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/"
    })

    console.log("[AUTH_DEBUG] Sign-in successful for:", email)
    return { success: true }
  } catch (err) {
    console.error("[AUTH_DEBUG] Critical sign-in error:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}
