import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { verifyPIN } from "@/lib/auth/pin-auth"

const LOCKOUT_ATTEMPTS = 3
const LOCKOUT_MINUTES = 5

export async function POST(request: Request) {
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

    // Fetch ALL active staff with PINs (global search)
    const { data: staffList, error: staffError } = await supabaseAdmin
      .from("staff")
      .select(
        "staff_id, auth_user_id, pin_hash, account_id, role, failed_attempts, locked_until, active"
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

    const now = new Date()
    let matchedStaff: (typeof staffList)[0] | null = null

    // Try to match PIN against all active staff
    for (const staff of staffList) {
      // Skip if locked
      if (staff.locked_until) {
        const lockedUntil = new Date(staff.locked_until)
        if (lockedUntil > now) {
          continue // Skip locked staff
        }
      }

      // Verify PIN against hash
      if (!staff.pin_hash) continue

      const isMatch = await verifyPIN(trimmedPin, staff.pin_hash)
      if (isMatch) {
        matchedStaff = staff
        break
      }
    }

    // If no match found, increment failed attempts for all staff with similar PIN patterns
    // (This prevents brute force attacks by making it expensive to try many PINs)
    if (!matchedStaff) {
      // Increment failed attempts for all staff (rate limiting)
      // In a production system, you might want more sophisticated rate limiting
      const failedStaff = staffList.filter((s) => {
        if (!s.locked_until) return true
        const lockedUntil = new Date(s.locked_until)
        return lockedUntil <= now
      })

      for (const staff of failedStaff) {
        const currentAttempts = Number(staff.failed_attempts) || 0
        const nextAttempts = currentAttempts + 1

        const updates: {
          failed_attempts: number
          locked_until?: string
        } = {
          failed_attempts: nextAttempts,
        }

        if (nextAttempts >= LOCKOUT_ATTEMPTS) {
          const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
          updates.locked_until = lockedUntil.toISOString()
        }

        try {
          await supabaseAdmin
            .from("staff")
            .update(updates)
            .eq("staff_id", staff.staff_id)
        } catch {
          // Ignore update errors
        }
      }

      return NextResponse.json(
        { error: "Invalid PIN. Try again." },
        { status: 401 }
      )
    }

    // PIN matched! Reset failed attempts and record login
    await supabaseAdmin
      .from("staff")
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      })
      .eq("staff_id", matchedStaff.staff_id)

    // Get auth user for this staff
    if (!matchedStaff.auth_user_id) {
      return NextResponse.json(
        { error: "Staff account not properly configured. Contact administrator." },
        { status: 500 }
      )
    }

    const { data: authUser, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(matchedStaff.auth_user_id)

    if (authUserError || !authUser.user) {
      return NextResponse.json(
        { error: "Failed to retrieve staff account. Contact administrator." },
        { status: 500 }
      )
    }

    // Generate magic link for sign-in
    const origin = request.headers.get("origin") || ""
    const redirectTo = origin
      ? `${origin}/auth/callback`
      : "/auth/callback"

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: authUser.user.email!,
        options: { redirectTo },
      })

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: "Failed to create sign-in session. Try again." },
        { status: 500 }
      )
    }

    const actionLink = linkData.properties.action_link as string
    const baseUrl = supabaseUrl.replace(/\/$/, "")
    const signInLink = actionLink.startsWith("http")
      ? actionLink
      : `${baseUrl}/${actionLink}`

    return NextResponse.json({
      sign_in_link: signInLink,
      staff_id: matchedStaff.staff_id,
      account_id: matchedStaff.account_id,
      role: matchedStaff.role,
    })
  } catch (error) {
    console.error("PIN login error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
