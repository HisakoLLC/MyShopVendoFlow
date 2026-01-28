"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * Ensures the current user has a staff record for their account (so sales can set cashier_id).
 * If none exists, creates one with their auth email and account. Returns staff_id or null.
 */
export async function ensureStaffForCurrentUser(): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) return null

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] : accountIdRaw
  if (accountIdError || !accountId) return null

  const accountIdStr = typeof accountId === "string" ? accountId : String(accountId)
  const email = user.email.trim()

  // Find existing staff for this account + email
  const { data: existing, error: selectError } = await supabase
    .from("staff")
    .select("staff_id")
    .eq("account_id", accountIdStr)
    .ilike("email", email)
    .limit(1)
    .maybeSingle()

  if (selectError) return null
  if (existing?.staff_id) return existing.staff_id

  // Create a staff row for the current user so they can act as cashier
  const nameFromMeta =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    email.split("@")[0]
  const parts = nameFromMeta.trim().split(/\s+/)
  const first = parts[0] ?? "Staff"
  const last = parts.length > 1 ? parts.slice(1).join(" ") : null

  const { data: inserted, error: insertError } = await supabase
    .from("staff")
    .insert({
      account_id: accountIdStr,
      email,
      first_name: first,
      last_name: last,
      active: true,
    })
    .select("staff_id")
    .single()

  if (insertError) return null
  return inserted?.staff_id ?? null
}
