import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env"

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

    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/signup", "/onboarding", "/reset-password"]
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

    // If error getting user or no user session, redirect to login
    if (userError || !user) {
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user has completed onboarding (has account_members record)
    const { data: accountMember, error: memberError } = await supabase
      .from("account_members")
      .select("account_id")
      .eq("user_id", user.id)
      .single()

    // If no account_members record, redirect to onboarding
    if (memberError || !accountMember) {
      if (pathname !== "/onboarding") {
        return NextResponse.redirect(new URL("/onboarding", request.url))
      }
      return response
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
