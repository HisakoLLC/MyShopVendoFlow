"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAccountAfterSignup } from "@/app/signup/actions"

/**
 * Ensures the current user has an account (and account_members row).
 * If they don't, creates one with default "My Business" so onboarding can continue.
 * Use this when get_account_id() returns null so the user can still complete setup.
 */
export async function ensureAccountForCurrentUser(): Promise<
  { success: true; accountId: string } | { success: false; error: string }
> {
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
    .single()

  if (member?.account_id) {
    return { success: true, accountId: member.account_id }
  }

  try {
    const result = await createAccountAfterSignup(
      user.id,
      "My Business",
      user.email ?? ""
    )
    if (result?.account_id) {
      return { success: true, accountId: result.account_id }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create account."
    return { success: false, error: message }
  }

  return { success: false, error: "Could not create account." }
}
