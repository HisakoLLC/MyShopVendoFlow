import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSupabaseUrl } from "@/lib/supabase/env"

/**
 * Called when the user is authenticated but has no account_members row
 * (e.g. after account deletion). If their account is scheduled for deletion,
 * signs them out and redirects to /login?deleted=1. Otherwise redirects to /onboarding.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const { data: member } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (member?.account_id) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  const supabaseUrl = getSupabaseUrl()
  if (serviceRoleKey && supabaseUrl && user.email?.trim()) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
    const { data: cancelled } = await admin
      .from("accounts")
      .select("account_id")
      .eq("owner_email", user.email.trim())
      .eq("subscription_status", "cancelled")
      .limit(1)
      .maybeSingle()

    if (cancelled?.account_id) {
      await supabase.auth.signOut()
      const url = new URL("/login", request.url)
      url.searchParams.set("deleted", "1")
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.redirect(new URL("/onboarding", request.url))
}
