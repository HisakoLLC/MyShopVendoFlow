import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser || adminUser.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: broadcastId } = params

    // 1. Fetch pending recipients
    const { data: recipients, error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("broadcast_recipients")
      .select(`
        *,
        conversation:conversation_id (contact_phone)
      `)
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending")

    if (error) throw error
    if (!recipients?.length) {
      return NextResponse.json({ message: "No pending recipients" })
    }

    // 2. Fetch broadcast template info
    const { data: broadcast } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("broadcasts")
      .select("*")
      .eq("id", broadcastId)
      .single()

    if (!broadcast) throw new Error("Broadcast not found")

    // 3. Dispatch loop with throttling
    let sentCount = 0
    let failedCount = 0

    for (const r of recipients) {
      const phone = (r.conversation as any)?.contact_phone
      if (!phone) {
        failedCount++
        continue
      }

      try {
        // --- Meta Cloud API Call (Mocked for this task) ---
        // const metaRes = await fetch(`https://graph.facebook.com/v17.0/${phone}/messages`, { ... })
        // const metaData = await metaRes.json()
        
        // Simulating 200ms delay for rate limit protection
        await new Promise(resolve => setTimeout(resolve, 200))

        const { error: updateError } = await supabaseAdmin
          .schema(ADMIN_SCHEMA as any)
          .from("broadcast_recipients")
          .update({ 
            status: "sent", 
            sent_at: new Date().toISOString(),
            meta_message_id: `mock_${Math.random().toString(36).substring(7)}` 
          })
          .eq("id", r.id)

        if (updateError) throw updateError
        sentCount++

      } catch (err: any) {
        console.error(`Failed to send to ${phone}`, err)
        await supabaseAdmin
          .schema(ADMIN_SCHEMA as any)
          .from("broadcast_recipients")
          .update({ status: "failed", error_message: err.message })
          .eq("id", r.id)
        failedCount++
      }
    }

    // 4. Update final broadcast status
    await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("broadcasts")
      .update({
        status: failedCount === recipients.length ? "failed" : "completed",
        sent_at: new Date().toISOString(),
        sent_count: (broadcast.sent_count || 0) + sentCount,
        failed_count: (broadcast.failed_count || 0) + failedCount
      })
      .eq("id", broadcastId)

    return NextResponse.json({ sentCount, failedCount })

  } catch (err: any) {
    console.error("[broadcast/send] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
