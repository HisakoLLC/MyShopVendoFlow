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

    // 1. Fetch the user's password hash directly from auth.users (via service role)
    const { data: userData, error: userError } = await supabase
      .schema("auth" as any)
      .from("users")
      .select("id, encrypted_password")
      .eq("email", email)
      .maybeSingle()

    if (userError) {
      console.error("[AUTH_DEBUG] Error fetching user from auth.users:", userError)
      return { success: false, error: `Database error: ${userError.message}` }
    }

    if (!userData) {
      console.warn("[AUTH_DEBUG] No user found for email:", email)
      return { success: false, error: "Invalid email or password" }
    }

    console.log("[AUTH_DEBUG] User found in auth.users. Comparing passwords...")

    // 2. Verify password using bcryptjs
    const isPasswordValid = await bcrypt.compare(pass, userData.encrypted_password || "")
    if (!isPasswordValid) {
      console.warn("[AUTH_DEBUG] BCrypt comparison failed for user:", email)
      return { success: false, error: "Invalid email or password" }
    }

    console.log("[AUTH_DEBUG] BCrypt comparison successful. Verifying admin status...")

    // 3. Verify they are in the vendo_admin.admin_users table
    const { data: adminRecord, error: adminError } = await supabase
      .schema("vendo_admin" as any)
      .from("admin_users")
      .select("id, is_active")
      .eq("id", userData.id)
      .maybeSingle()

    if (adminError) {
      console.error("[AUTH_DEBUG] Error verifying admin status:", adminError)
      return { success: false, error: `Admin verification error: ${adminError.message}` }
    }

    if (!adminRecord) {
      console.warn("[AUTH_DEBUG] User is not in admin_users table:", email)
      return { success: false, error: "Account not authorized for admin console" }
    }

    if (!adminRecord.is_active) {
      console.warn("[AUTH_DEBUG] Admin account is inactive:", email)
      return { success: false, error: "Administrator account is inactive" }
    }

    console.log("[AUTH_DEBUG] Admin status verified. Creating session...")

    // 4. Create a custom session
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days session

    const { data: sessionData, error: sessionError } = await supabase
      .schema("vendo_admin" as any)
      .from("admin_sessions")
      .insert({
        user_id: userData.id,
        expires_at: expiresAt.toISOString()
      })
      .select("id")
      .single()

    if (sessionError) {
      console.error("[AUTH_DEBUG] Failed to create admin session:", sessionError)
      return { success: false, error: `Session Error: ${sessionError.message}` }
    }

    console.log("[AUTH_DEBUG] Session created successfully. Setting cookie...")

    // 5. Set the session cookie
    cookieStore.set("vendoflow_admin_session", sessionData.id, {
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
