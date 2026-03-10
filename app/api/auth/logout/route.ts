import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { logAuditEvent, getIpAddress, getUserAgent } from "@/lib/audit/logger"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      if (userError) console.warn("[api][auth][logout] getUser error", { error: userError.message })
    } else {
      // Get staff info if staff user
      let staffId: string | undefined
      let accountId: string | undefined

      if (user.email?.includes("@vendoflow.internal")) {
        const { data: staff } = await supabase
          .from("staff")
          .select("staff_id, account_id")
          .eq("auth_user_id", user.id)
          .maybeSingle()

        staffId = staff?.staff_id
        accountId = staff?.account_id
      } else {
        const { data: accountMember } = await supabase
          .from("account_members")
          .select("account_id")
          .eq("user_id", user.id)
          .maybeSingle()

        accountId = accountMember?.account_id
      }

      // Log logout event
      if (accountId) {
        await logAuditEvent({
          account_id: accountId,
          user_id: user.id,
          staff_id: staffId,
          action_type: staffId ? "staff_logout" : "owner_logout",
          ip_address: getIpAddress(request),
          user_agent: getUserAgent(request),
          metadata: { logout_method: "manual" },
        })
      }

      // Sign out
      await supabase.auth.signOut()
    }

    // Clear all session cookies
    const response = NextResponse.json({ success: true })
    response.cookies.delete("last_activity")
    response.cookies.delete("session_start")
    response.cookies.delete("user_role")

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "Failed to log out" },
      { status: 500 }
    )
  }
}
