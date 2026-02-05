import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { verifyPIN } from "@/lib/auth/pin-auth"
import { logAuditEvent, getIpAddress, getUserAgent } from "@/lib/audit/logger"

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 5

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = body as { pin?: string }

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "PIN is required" },
        { status: 400 }
      )
    }

    const trimmedPin = pin.trim()
    if (trimmedPin.length !== 6 || !/^\d{6}$/.test(trimmedPin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 6 digits" },
        { status: 400 }
      )
    }

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
    const supabaseUrl = getSupabaseUrl()
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get IP address for rate limiting
    const ipAddress = getIpAddress(request)
    if (!ipAddress) {
      return NextResponse.json(
        { error: "Could not determine IP address" },
        { status: 400 }
      )
    }

    // Check IP-based rate limiting
    const { data: ipAttempt, error: ipAttemptError } = await supabaseAdmin
      .from("pin_login_attempts")
      .select("*")
      .eq("ip_address", ipAddress)
      .maybeSingle()

    if (ipAttemptError && ipAttemptError.code !== "PGRST116") {
      console.error("Failed to check IP attempts:", ipAttemptError)
    }

    // Check if IP is locked
    if (ipAttempt?.locked_until) {
      const lockedUntil = new Date(ipAttempt.locked_until)
      if (lockedUntil > new Date()) {
        const remainingSeconds = Math.ceil(
          (lockedUntil.getTime() - Date.now()) / 1000
        )
        return NextResponse.json(
          {
            error: `Too many failed attempts. Try again in ${remainingSeconds} seconds.`,
            locked_until: ipAttempt.locked_until,
          },
          { status: 429 }
        )
      }
    }

    // Fetch ALL active staff with PINs (global search)
    const { data: staffList, error: staffError } = await supabaseAdmin
      .from("staff")
      .select(
        "staff_id, auth_user_id, pin_hash, account_id, role, assigned_store_id, active"
      )
      .eq("active", true)
      .not("pin_hash", "is", null)
      .not("auth_user_id", "is", null)

    if (staffError) {
      console.error("Failed to fetch staff:", staffError)
      return NextResponse.json(
        { error: "Failed to verify PIN. Please try again." },
        { status: 500 }
      )
    }

    if (!staffList || staffList.length === 0) {
      return NextResponse.json(
        { error: "Invalid PIN. Try again." },
        { status: 401 }
      )
    }

    // Find matching staff by PIN
    let matchedStaff: (typeof staffList)[0] | null = null

    for (const staff of staffList) {
      if (!staff.pin_hash) continue

      const isMatch = await verifyPIN(trimmedPin, staff.pin_hash)
      if (isMatch) {
        matchedStaff = staff
        break
      }
    }

    // If no match found, increment IP attempt counter
    if (!matchedStaff) {
      const newAttemptCount = (ipAttempt?.attempt_count || 0) + 1
      const shouldLock = newAttemptCount >= MAX_ATTEMPTS
      const lockDuration = LOCKOUT_MINUTES * 60 * 1000 // Convert to milliseconds

      await supabaseAdmin.from("pin_login_attempts").upsert({
        ip_address: ipAddress,
        attempt_count: newAttemptCount,
        locked_until: shouldLock
          ? new Date(Date.now() + lockDuration).toISOString()
          : null,
        last_attempt_at: new Date().toISOString(),
      })

      // Log failed attempt
      await logAuditEvent({
        account_id: "00000000-0000-0000-0000-000000000000", // System-level event
        action_type: "pin_login_failed",
        ip_address: ipAddress,
        user_agent: getUserAgent(request),
        metadata: {
          reason: "invalid_pin",
          attempt_count: newAttemptCount,
          locked: shouldLock,
        },
      })

      if (shouldLock) {
        return NextResponse.json(
          { error: "Too many failed attempts. Try again in 5 minutes." },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: "Invalid PIN. Please try again." },
        { status: 401 }
      )
    }

    // PIN is correct - clear IP attempts
    await supabaseAdmin
      .from("pin_login_attempts")
      .delete()
      .eq("ip_address", ipAddress)

    // Get auth user for this staff
    if (!matchedStaff.auth_user_id) {
      return NextResponse.json(
        {
          error: "Staff account not properly configured. Contact administrator.",
        },
        { status: 500 }
      )
    }

    const { data: authUser, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(matchedStaff.auth_user_id)

    if (authUserError || !authUser.user) {
      return NextResponse.json(
        {
          error: "Failed to retrieve staff account. Contact administrator.",
        },
        { status: 500 }
      )
    }

    const staffEmail = authUser.user.email!

    // Generate magic link to get session tokens (admin API)
    // The link contains tokens in the URL hash, which we'll extract
    const origin = request.headers.get("origin") || request.headers.get("referer") || ""
    const redirectTo = origin ? `${origin}/auth/callback` : "/auth/callback"

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: staffEmail,
        options: { redirectTo },
      })

    if (linkError || !linkData) {
      console.error("Failed to generate sign-in link:", linkError)
      return NextResponse.json(
        { error: "Failed to create sign-in session. Try again." },
        { status: 500 }
      )
    }

    // Extract tokens from the magic link URL hash
    // The link format is: https://...?token=...&type=magiclink#access_token=...&refresh_token=...
    const actionLink = linkData.properties?.action_link as string | undefined
    if (!actionLink) {
      console.error("Missing action_link in generateLink response")
      return NextResponse.json(
        { error: "Failed to create sign-in session. Try again." },
        { status: 500 }
      )
    }

    // Parse tokens from URL hash
    const url = new URL(actionLink)
    const hash = url.hash.slice(1) // Remove leading #
    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (!accessToken || !refreshToken) {
      console.error("Missing tokens in magic link URL:", actionLink)
      return NextResponse.json(
        { error: "Failed to create sign-in session. Try again." },
        { status: 500 }
      )
    }

    // Update staff last login
    await supabaseAdmin
      .from("staff")
      .update({ last_login_at: new Date().toISOString() })
      .eq("staff_id", matchedStaff.staff_id)

    // Log successful login
    await logAuditEvent({
      account_id: matchedStaff.account_id,
      user_id: authUser.user.id,
      staff_id: matchedStaff.staff_id,
      action_type: "staff_login",
      ip_address: ipAddress,
      user_agent: getUserAgent(request),
      metadata: {
        login_method: "pin",
        success: true,
      },
    })

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
      },
    })
  } catch (error) {
    console.error("PIN login error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
