import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env"
import { getRoleFromUser, canAccessPath, type StaffRole } from "@/lib/auth/roles"

export async function middleware(request: NextRequest) {
  try {
    // Check for required environment variables (supports both NEXT_PUBLIC_* and SUPABASE_* names)
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables")
      // Allow request to proceed if env vars are missing (will fail gracefully in app)
      return NextResponse.next()
    }

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const pathname = request.nextUrl.pathname

    // 1. API routes bypass
    if (pathname.startsWith("/api")) {
      return response
    }

    // 2. Initialize Supabase client
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: "", ...options })
        },
      },
    })

    // 3. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // 4. Handle Public Auth Routes (/login, /signup, etc.)
    const publicAuthRoutes = ["/login", "/signup", "/auth/pin-login"]
    const isPublicAuthRoute = publicAuthRoutes.some((route) => pathname.startsWith(route))

    if (isPublicAuthRoute) {
      if (user) {
        // Already logged in, bounce to dashboard (or where they were going)
        const redirectTo = request.nextUrl.searchParams.get("redirect") || "/dashboard"
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
      return response
    }

    // 5. Handle Protected Routes
    if (!user && pathname !== "/auth/callback" && pathname !== "/reset-password") {
      const isPos = pathname === "/pos" || pathname.startsWith("/pos/")
      const redirectPath = isPos ? "/auth/pin-login" : "/login"
      const redirectUrl = new URL(redirectPath, request.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user query failed, we probably don't have a valid session
    if (userError || !user) {
        // Fallback for unexpected cases
        return response
    }

    // 6. SESSION TIMEOUT LOGIC
    const now = Date.now()
    const lastActivityCookie = request.cookies.get("last_activity")?.value
    const sessionStartCookie = request.cookies.get("session_start")?.value

    // Determine if user is staff
    const isStaff = user.email?.includes("@vendoflow.internal") ?? false
    // Idle timeout: 8h for staff, 24h for owners
    const maxIdleMs = isStaff ? 8 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    // Absolute timeout: 7 days
    const maxSessionMs = 7 * 24 * 60 * 60 * 1000

    // Check idle timeout
    if (lastActivityCookie) {
      const idleMs = now - parseInt(lastActivityCookie)
      if (idleMs > maxIdleMs) {
        await supabase.auth.signOut()
        const redirectUrl = new URL(isStaff ? "/auth/pin-login?timeout=idle" : "/login?timeout=idle", request.url)
        const timeoutResponse = NextResponse.redirect(redirectUrl)
        timeoutResponse.cookies.delete("last_activity")
        timeoutResponse.cookies.delete("session_start")
        timeoutResponse.cookies.delete("user_role")
        return timeoutResponse
      }
    }

    // Check absolute timeout
    if (sessionStartCookie) {
      const sessionAge = now - parseInt(sessionStartCookie)
      if (sessionAge > maxSessionMs) {
        await supabase.auth.signOut()
        const redirectUrl = new URL(isStaff ? "/auth/pin-login?timeout=expired" : "/login?timeout=expired", request.url)
        const timeoutResponse = NextResponse.redirect(redirectUrl)
        timeoutResponse.cookies.delete("last_activity")
        timeoutResponse.cookies.delete("session_start")
        timeoutResponse.cookies.delete("user_role")
        return timeoutResponse
      }
    } else {
      response.cookies.set("session_start", now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: Math.floor(maxSessionMs / 1000),
      })
    }

    // Update last activity
    response.cookies.set("last_activity", now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.floor(maxIdleMs / 1000),
    })

    // 7. Role & Access Checks
    const { data: staffRecord } = await supabase
      .from("staff")
      .select("role, account_id, active")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (staffRecord) {
      if (!staffRecord.active) {
        await supabase.auth.signOut()
        const redirectUrl = new URL("/auth/pin-login", request.url)
        redirectUrl.searchParams.set("error", "account_deactivated")
        return NextResponse.redirect(redirectUrl)
      }

      if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
        return NextResponse.redirect(new URL("/pos", request.url))
      }

      const role: StaffRole = (staffRecord.role === "owner" || staffRecord.role === "manager" || staffRecord.role === "cashier") 
        ? staffRecord.role as StaffRole 
        : "cashier"

      if (!canAccessPath(pathname, role)) {
        return NextResponse.redirect(new URL("/pos", request.url))
      }
      return response
    }

    // 8. Onboarding Compliance
    const { data: accountMember, error: memberError } = await supabase
      .from("account_members")
      .select("account_id")
      .eq("user_id", user.id)
      .single()

    if (memberError || !accountMember) {
      if (pathname !== "/onboarding" && !pathname.startsWith("/api/auth/ensure-route")) {
        return NextResponse.redirect(new URL("/api/auth/ensure-route", request.url))
      }
      return response
    }

    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      const { count } = await supabase
        .from("stores")
        .select("store_id", { count: "exact", head: true })
        .eq("account_id", accountMember.account_id)
      if (count != null && count > 0) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }

    // 9. Subscription Check
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("subscription_status")
      .eq("account_id", accountMember.account_id)
      .single()

    if (!accountError && account && account.subscription_status === "cancelled") {
      if (pathname !== "/settings") {
        const redirectUrl = new URL("/settings", request.url)
        redirectUrl.searchParams.set("tab", "billing")
        redirectUrl.searchParams.set("expired", "true")
        return NextResponse.redirect(redirectUrl)
      }
    }

    return response
  } catch (error) {
    // Log error for debugging but don't crash the middleware
    console.error("Middleware error:", error)
    // Return a response to allow the request to proceed
    // The app will handle authentication on its own if middleware fails
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
