import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const previewOnly = searchParams.get("previewOnly") === "true"
    const segment = searchParams.get("segment")
    const customAccountIds = searchParams.get("customAccountIds")?.split(",") || []

    if (previewOnly && segment) {
      // ─── Recipient Preview Logic ───────────────────────────────────────────────────
      let query = supabaseAdmin.from("accounts").select("account_id", { count: "exact" })

      if (segment === "Active") query = query.eq("subscription_status", "active")
      else if (segment === "Trial") query = query.eq("subscription_status", "trialing")
      else if (segment === "Past Due") query = query.eq("subscription_status", "past_due")
      else if (["Starter", "Core", "Scale"].includes(segment)) query = query.eq("plan_tier", segment.toLowerCase())
      else if (segment === "Custom") query = query.in("account_id", customAccountIds)
      
      const { count, error: countError } = await query

      if (countError) throw countError

      // Filter for those with WhatsApp conversations
      const { data: convs, error: convError } = await supabaseAdmin
        .schema("admin" as any)
        .from("whatsapp_conversations")
        .select("merchant_id")
        .not("merchant_id", "is", null)

      if (convError) throw convError

      const convMerchantIds = new Set(convs.map(c => c.merchant_id))
      
      // Since we can't easily JOIN across schemas in Supabase JS comfortably for complex counts,
      // we'll fetch the account IDs for the segment and intersect.
      const { data: accounts } = await query.select("account_id")
      const eligibleCount = (accounts || []).filter(a => convMerchantIds.has(a.account_id)).length
      const skippedCount = (count || 0) - eligibleCount

      return NextResponse.json({ 
        totalMerchantCount: count || 0,
        eligibleCount,
        skippedCount
      })
    }

    // ─── List Broadcasts ──────────────────────────────────────────────────────────
    const { data: broadcasts, error } = await supabaseAdmin
      .schema("admin" as any)
      .from("broadcasts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ broadcasts })
  } catch (err: any) {
    console.error("[broadcasts] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser || adminUser.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, templateName, templateParams, segment, customAccountIds, scheduledAt } = await req.json()

    // 1. Resolve eligible merchants
    let query = supabaseAdmin.from("accounts").select("account_id")

    if (segment === "Active") query = query.eq("subscription_status", "active")
    else if (segment === "Trial") query = query.eq("subscription_status", "trialing")
    else if (segment === "Past Due") query = query.eq("subscription_status", "past_due")
    else if (["Starter", "Core", "Scale"].includes(segment)) query = query.eq("plan_tier", segment.toLowerCase())
    else if (segment === "Custom") query = query.in("account_id", customAccountIds || [])

    const { data: accounts } = await query
    if (!accounts) throw new Error("Failed to fetch segment accounts")

    // 2. Map to WhatsApp conversations (latest active)
    const { data: convs } = await supabaseAdmin
      .schema("admin" as any)
      .from("whatsapp_conversations")
      .select("id, merchant_id, contact_phone")
      .in("merchant_id", accounts.map(a => a.account_id))

    const recipientsMap = new Map()
    convs?.forEach(c => {
      // Keep only one conversation per merchant (the latest)
      recipientsMap.set(c.merchant_id, c)
    })

    const eligibleRecipients = Array.from(recipientsMap.values())
    const skippedCount = accounts.length - eligibleRecipients.length

    // 3. Create Broadcast
    const { data: broadcast, error: bError } = await supabaseAdmin
      .schema("admin" as any)
      .from("broadcasts")
      .insert({
        name,
        template_name: templateName,
        template_params: templateParams,
        segment,
        custom_account_ids: customAccountIds,
        status: scheduledAt ? "scheduled" : (eligibleRecipients.length > 0 ? "sending" : "completed"),
        scheduled_at: scheduledAt,
        total_recipients: eligibleRecipients.length,
        sent_count: 0,
        failed_count: 0,
        created_by: adminUser.id
      })
      .select()
      .single()

    if (bError) throw bError

    // 4. Create Recipients
    if (eligibleRecipients.length > 0) {
      const recipientInserts = eligibleRecipients.map(r => ({
        broadcast_id: broadcast.id,
        conversation_id: r.id,
        account_id: r.merchant_id,
        status: "pending"
      }))

      const { error: rError } = await supabaseAdmin
        .schema("admin" as any)
        .from("broadcast_recipients")
        .insert(recipientInserts)

      if (rError) throw rError

      // 5. Trigger sending if not scheduled
      if (!scheduledAt) {
        // We'll trigger the send API from the client or background worker
        // For this task, we return and let the client hit the [id]/send endpoint
      }
    }

    return NextResponse.json({ 
      broadcast, 
      recipientCount: eligibleRecipients.length, 
      skippedCount 
    })

  } catch (err: any) {
    console.error("[broadcasts] POST Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
