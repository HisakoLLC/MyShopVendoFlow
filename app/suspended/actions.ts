"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export type SuspensionData = {
  accountName: string
  plan: string
  status: string
  accessEnded: string | null
  amountDue: number
  adminNote?: string
}

/**
 * Fetches necessary information to display on the suspended page.
 */
export async function getSuspensionData(): Promise<SuspensionData | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) return null

    // 1. Get Account ID
    const { data: member } = await supabase
      .from("account_members")
      .select("account_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!member?.account_id) return null

    // 2. Get Account Details
    const { data: account } = await supabase
      .from("accounts")
      .select("business_name, plan_tier, subscription_status, subscription_current_period_end")
      .eq("account_id", member.account_id)
      .single()

    if (!account) return null

    // 3. Get Amount Due (Unpaid Invoices)
    const { data: unpaidInvoices } = await supabase
      .from("vendo_admin.invoices")
      .select("amount_kes")
      .eq("account_id", member.account_id)
      .eq("status", "unpaid")

    const amountDue = (unpaidInvoices as any[])?.reduce((sum: number, inv: any) => sum + Number(inv.amount_kes || 0), 0) || 0

    return {
      accountName: account.business_name || "Boutique Account",
      plan: account.plan_tier || "core",
      status: account.subscription_status || "suspended",
      accessEnded: account.subscription_current_period_end,
      amountDue,
    }
  } catch (error) {
    console.error("[getSuspensionData] Error:", error)
    return null
  }
}

/**
 * Re-checks the subscription status and redirects to dashboard if active.
 */
export async function checkSubscriptionStatusAction() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, message: "Not authenticated" }

  // 1. Get Account ID
  const { data: member } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!member?.account_id) return { success: false, message: "Account not found" }

  // 2. Fetch fresh status
  const { data: account } = await supabase
    .from("accounts")
    .select("subscription_status")
    .eq("account_id", member.account_id)
    .single()

  if (account?.subscription_status === "active") {
    return { success: true, redirect: "/dashboard" }
  }

  return { 
    success: false, 
    message: "Account still suspended. If you've just paid, please allow up to 2 hours for M-Pesa confirmation." 
  }
}
