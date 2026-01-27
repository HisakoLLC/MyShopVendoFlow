"use server"

import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import { revalidatePath } from "next/cache"
import { getSupabaseUrl } from "@/lib/supabase/env"

export async function createAccountAfterSignup(
  userId: string,
  businessName: string,
  ownerEmail: string
) {
  // Use service role key for account creation during signup
  // This bypasses RLS since the session might not be fully established yet
  // This is safe because we're creating the account for the user who just signed up
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  const supabaseUrl = getSupabaseUrl()

  if (!serviceRoleKey) {
    console.error("Service role key missing. Checked:", {
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SERVICE_ROLE_KEY: !!process.env.SERVICE_ROLE_KEY,
    })
    throw new Error(
      "Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your .env.local file and restart the dev server."
    )
  }

  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL not configured. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SUPABASE_URL in your env (e.g. Vercel Environment Variables)."
    )
  }

  // Validate the key format (service role keys are very long JWT tokens)
  if (serviceRoleKey.length < 100) {
    console.error("Service role key appears to be invalid (too short). Length:", serviceRoleKey.length)
    throw new Error(
      "Service role key appears to be invalid. Please check that you copied the entire key from Supabase Dashboard → Settings → API → service_role key (NOT the anon key)."
    )
  }

  console.log("Using service role key (length:", serviceRoleKey.length, "chars)")

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // If user already has an account (e.g. DB trigger already created one), return it
  const { data: existing } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()
  if (existing?.account_id) {
    revalidatePath("/")
    return { account_id: existing.account_id }
  }

  // Create account
  const accountId = uuidv4()
  console.log("Creating account:", { accountId, businessName, ownerEmail, userId })

  const { data: accountData, error: accountError } = await supabase
    .from("accounts")
    .insert({
      account_id: accountId,
      business_name: businessName.trim(),
      owner_email: ownerEmail.trim(),
      plan_tier: null, // Will be set during onboarding
      subscription_status: "trial",
    })
    .select()
    .single()

  if (accountError) {
    console.error("Account creation error:", accountError)
    const code = (accountError as { code?: string }).code
    const permissionDenied = code === "42501" || String(accountError.message).toLowerCase().includes("permission denied")

    if (permissionDenied) {
      const errorMsg = `Permission denied creating account (Code: ${code}). This usually means RLS policies are missing or misconfigured. 

To fix this:
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL script from: sql/FIX_ALL_RLS_ISSUES.sql
   (This will create the necessary RLS policies for accounts and account_members tables)
3. Also verify SUPABASE_SERVICE_ROLE_KEY is set correctly in your .env.local file
4. Restart your dev server after making changes

If the issue persists, check that your service role key is the full key from Supabase Dashboard → Settings → API → service_role (NOT the anon key).`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }
    throw new Error(`Failed to create account: ${accountError.message}. Code: ${code ?? "unknown"}`)
  }

  if (!accountData) {
    throw new Error("Account was not created - no data returned")
  }

  console.log("Account created successfully:", accountData.account_id)

  // Link user to account
  const memberId = uuidv4()
  console.log("Creating account_members record:", { memberId, accountId, userId })
  
  const { data: memberData, error: memberError } = await supabase
    .from("account_members")
    .insert({
      member_id: memberId,
      account_id: accountId,
      user_id: userId,
      role: "owner",
    })
    .select()
    .single()

  if (memberError) {
    console.error("Account member creation error:", memberError)
    await supabase.from("accounts").delete().eq("account_id", accountId)
    const code = (memberError as { code?: string }).code
    const permissionDenied = code === "42501" || String(memberError.message).toLowerCase().includes("permission denied")
    if (permissionDenied) {
      const errorMsg = `Permission denied linking account (Code: ${code}). This usually means RLS policies are missing or misconfigured.

To fix this:
1. Go to Supabase Dashboard → SQL Editor  
2. Run the SQL script from: sql/FIX_ALL_RLS_ISSUES.sql
   (This will create the necessary RLS policies for account_members table)
3. Also verify SUPABASE_SERVICE_ROLE_KEY is set correctly in your .env.local file
4. Restart your dev server after making changes`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }
    throw new Error(`Failed to link user to account: ${memberError.message}. Code: ${code ?? "unknown"}`)
  }

  if (!memberData) {
    // Cleanup: delete account
    await supabase.from("accounts").delete().eq("account_id", accountId)
    throw new Error("Account member was not created - no data returned")
  }

  console.log("Account member created successfully:", memberData.member_id)

  revalidatePath("/")
  return { account_id: accountId }
}
