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

    // Public routes that don't require authentication (/onboarding is first-time only, not public)
    const publicRoutes = ["/login", "/signup", "/reset-password", "/auth/pin-login", "/auth/callback"]
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))
    const isApiRoute = pathname.startsWith("/api")

    // Allow public routes and API routes
    if (isPublicRoute || isApiRoute) {
      return response
    }

    // Create Supabase client
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    })

    // Get current user session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    // If error getting user or no user session: /pos -> pin-login, else -> login
    if (userError || !user) {
      const isPos = pathname === "/pos" || pathname.startsWith("/pos/")
      const redirectPath = isPos ? "/auth/pin-login" : "/login"
      const redirectUrl = new URL(redirectPath, request.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user is staff (has auth_user_id in staff table)
    const { data: staffRecord } = await supabase
      .from("staff")
      .select("role, account_id, active")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    // If staff user, check role-based access
    if (staffRecord) {
      if (!staffRecord.active) {
        // Staff is deactivated, sign them out
        await supabase.auth.signOut()
        const redirectUrl = new URL("/auth/pin-login", request.url)
        redirectUrl.searchParams.set("error", "account_deactivated")
        return NextResponse.redirect(redirectUrl)
      }

      // Staff cannot access onboarding (first-time is for account owners only)
      if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
        return NextResponse.redirect(new URL("/pos", request.url))
      }

      // Get role from database (not user_metadata - more secure)
      const role: StaffRole =
        staffRecord.role === "owner" || staffRecord.role === "manager" || staffRecord.role === "cashier"
          ? staffRecord.role
          : "cashier"

      if (!canAccessPath(pathname, role)) {
        const redirectUrl = new URL("/pos", request.url)
        return NextResponse.redirect(redirectUrl)
      }

      return response
    }

    // Check if user has completed onboarding (has account_members record)
    const { data: accountMember, error: memberError } = await supabase
      .from("account_members")
      .select("account_id")
      .eq("user_id", user.id)
      .single()

    // If no account_members record, send to ensure-route (then to /onboarding for first-time only)
    if (memberError || !accountMember) {
      if (pathname !== "/onboarding" && !pathname.startsWith("/api/auth/ensure-route")) {
        return NextResponse.redirect(new URL("/api/auth/ensure-route", request.url))
      }
      return response
    }

    // Onboarding is first-time only: if user has at least one store (completed onboarding), redirect away
    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      const { count } = await supabase
        .from("stores")
        .select("store_id", { count: "exact", head: true })
        .eq("account_id", accountMember.account_id)
      if (count != null && count > 0) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }

    // Check subscription status from accounts table
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("subscription_status")
      .eq("account_id", accountMember.account_id)
      .single()

    // If subscription is cancelled, redirect to settings (billing tab) with banner
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
