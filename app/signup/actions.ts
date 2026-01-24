"use server"

import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import { revalidatePath } from "next/cache"

export async function createAccountAfterSignup(
  userId: string,
  businessName: string,
  ownerEmail: string
) {
  // Use service role key for account creation during signup
  // This bypasses RLS since the session might not be fully established yet
  // This is safe because we're creating the account for the user who just signed up
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
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
      "Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL in your .env.local file."
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
    throw new Error(`Failed to create account: ${accountError.message}. Code: ${accountError.code}`)
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
    // Cleanup: delete account
    await supabase.from("accounts").delete().eq("account_id", accountId)
    throw new Error(`Failed to link user to account: ${memberError.message}. Code: ${memberError.code}`)
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
