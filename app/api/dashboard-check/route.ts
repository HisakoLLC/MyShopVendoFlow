import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * GET /api/dashboard-check
 * Call this while logged in to see why the dashboard might be failing.
 * Returns: { ok, step?, accountId?, storesCount?, error? }
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        ok: false,
        step: "auth",
        error: userError?.message ?? "Not signed in",
        hint: "Log in at /login then try this URL again.",
      })
    }

    const { data: accountId, error: rpcError } = await supabase.rpc("get_account_id")

    if (rpcError) {
      return NextResponse.json({
        ok: false,
        step: "account",
        error: rpcError.message,
        code: (rpcError as { code?: string }).code,
        hint: "Run sql/AUTO_CREATE_ACCOUNT_ON_SIGNUP.sql and sql/FIX_ALL_RLS_ISSUES.sql in Supabase (same project as your app env vars).",
      })
    }

    if (!accountId) {
      return NextResponse.json({
        ok: false,
        step: "account",
        error: "get_account_id() returned null",
        hint: "Run sql/AUTO_CREATE_ACCOUNT_ON_SIGNUP.sql in Supabase. Check that your app's Supabase project is the same one where you ran the SQL.",
      })
    }

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("store_id")
      .eq("account_id", accountId)

    if (storesError) {
      return NextResponse.json({
        ok: false,
        step: "stores",
        accountId,
        error: storesError.message,
        code: (storesError as { code?: string }).code,
        hint: "Run sql/FIX_ALL_RLS_ISSUES.sql in Supabase. Ensure NEXT_PUBLIC_SUPABASE_URL and anon key in Vercel match the project where you ran the SQL.",
      })
    }

    const storesCount = stores?.length ?? 0

    return NextResponse.json({
      ok: true,
      accountId,
      storesCount,
      message:
        storesCount === 0
          ? "Account and RLS OK. Create a store via /onboarding to use the dashboard."
          : "All checks passed. Dashboard should load.",
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      ok: false,
      step: "exception",
      error: message,
      hint: "Check Vercel/server logs. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set and point to the same Supabase project where you ran the SQL.",
    })
  }
}
