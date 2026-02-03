"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { createAccountAfterSignup } from "@/app/signup/actions"
import { v4 as uuidv4 } from "uuid"

/**
 * Returns true if the current user's email is tied to an account that is
 * scheduled for deletion (subscription_status = 'cancelled'). Used to block
 * login and sign out deleted-account users.
 */
export async function isAccountDeletedForCurrentUser(): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email?.trim()) return false
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  const supabaseUrl = getSupabaseUrl()
  if (!serviceRoleKey || !supabaseUrl) return false
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data } = await admin
    .from("accounts")
    .select("account_id")
    .eq("owner_email", user.email.trim())
    .eq("subscription_status", "cancelled")
    .limit(1)
    .maybeSingle()
  return !!data?.account_id
}

/**
 * Ensures the current user has an account (and account_members row).
 * If they don't, creates one with default "My Business" so onboarding can continue.
 * Use this when get_account_id() returns null so the user can still complete setup.
 *
 * Uses the authenticated user's session (RLS policies) first so it works even when
 * SUPABASE_SERVICE_ROLE_KEY is not set (e.g. on some deployments). Falls back to
 * createAccountAfterSignup (service role) if session-based insert fails for other reasons.
 */
export async function ensureAccountForCurrentUser(): Promise<
  { success: true; accountId: string } | { success: false; error: string }
> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "Not signed in." }
  }

  const { data: member } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (member?.account_id) {
    return { success: true, accountId: member.account_id }
  }

  const ownerEmail = user.email?.trim() ?? ""
  if (ownerEmail) {
    const { data: existingAccount } = await supabase
      .from("accounts")
      .select("account_id, subscription_status")
      .eq("owner_email", ownerEmail)
      .limit(1)
      .maybeSingle()
    if (existingAccount?.account_id) {
      if (existingAccount.subscription_status === "cancelled") {
        return {
          success: false,
          error: "This account has been scheduled for deletion and can no longer be accessed.",
        }
      }
      const memberId = uuidv4()
      const { error: linkError } = await supabase.from("account_members").insert({
        member_id: memberId,
        account_id: existingAccount.account_id,
        user_id: user.id,
        role: "owner",
      })
      if (!linkError) {
        return { success: true, accountId: existingAccount.account_id }
      }
    }
  }

  // Create account + membership using the authenticated user's session.
  const accountId = uuidv4()
  const memberId = uuidv4()

  const { error: accountError } = await supabase.from("accounts").insert({
    account_id: accountId,
    business_name: "My Business",
    owner_email: ownerEmail,
    plan_tier: null,
    subscription_status: "active",
  })

  if (accountError) {
    const code = (accountError as { code?: string }).code
    if (code === "23505" && ownerEmail) {
      const { data: existingAccount } = await supabase
        .from("accounts")
        .select("account_id, subscription_status")
        .eq("owner_email", ownerEmail)
        .limit(1)
        .maybeSingle()
      if (existingAccount?.account_id) {
        if (existingAccount.subscription_status === "cancelled") {
          return {
            success: false,
            error: "This account has been scheduled for deletion and can no longer be accessed.",
          }
        }
        const memberId = uuidv4()
        const { error: linkError } = await supabase.from("account_members").insert({
          member_id: memberId,
          account_id: existingAccount.account_id,
          user_id: user.id,
          role: "owner",
        })
        if (!linkError) {
          return { success: true, accountId: existingAccount.account_id }
        }
      }
    }
    const isPermissionDenied =
      code === "42501" ||
      String(accountError.message).toLowerCase().includes("permission denied")
    if (isPermissionDenied) {
      try {
        const result = await createAccountAfterSignup(
          user.id,
          "My Business",
          user.email ?? ""
        )
        if (result?.account_id) {
          return { success: true, accountId: result.account_id }
        }
      } catch {
        // Return a clear error below
      }
    }
    return {
      success: false,
      error: `Failed to create account: ${accountError.message}. Code: ${code ?? "unknown"}`,
    }
  }

  const { error: memberError } = await supabase.from("account_members").insert({
    member_id: memberId,
    account_id: accountId,
    user_id: user.id,
    role: "owner",
  })

  if (memberError) {
    await supabase.from("accounts").delete().eq("account_id", accountId)
    const isPermissionDenied =
      (memberError as { code?: string }).code === "42501" ||
      String(memberError.message).toLowerCase().includes("permission denied")
    if (isPermissionDenied) {
      try {
        const result = await createAccountAfterSignup(
          user.id,
          "My Business",
          user.email ?? ""
        )
        if (result?.account_id) {
          return { success: true, accountId: result.account_id }
        }
      } catch {
        // fall through to return error
      }
    }
    return {
      success: false,
      error: `Failed to link account: ${memberError.message}. Code: ${(memberError as { code?: string }).code ?? "unknown"}`,
    }
  }

  return { success: true, accountId }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, error: message }
  }
}
