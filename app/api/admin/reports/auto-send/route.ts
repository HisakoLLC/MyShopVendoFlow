import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { distributeReportToConversations } from "@/lib/admin/reports"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    // 1. Authorization Check (Vercel Cron)
    const authHeader = req.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const baseUrl = new URL(req.url).origin

    // 2. Fetch Approved but Unsent Reports
    const { data: approvedReports, error } = await supabaseAdmin
      .schema("admin" as any)
      .from("reports")
      .select("id, merchant_id")
      .eq("status", "approved")
      .is("sent_at", null)

    if (error) throw error

    let sent = 0
    let failed = 0
    let skips = 0

    for (const report of (approvedReports || [])) {
      try {
        // Find primary WhatsApp conversation for this merchant
        const { data: conversations } = await supabaseAdmin
          .schema("admin" as any)
          .from("whatsapp_conversations")
          .select("id")
          .eq("merchant_id", report.merchant_id)
          .limit(5) // Send to up to 5 linked accounts

        if (!conversations || conversations.length === 0) {
          skips++
          continue
        }

        const ids = conversations.map(c => c.id)
        
        // Use shared distribution service
        await distributeReportToConversations(report.id, report.merchant_id, ids, baseUrl)
        sent++
      } catch (err) {
        console.error(`Auto-send failed for report ${report.id}:`, err)
        failed++
      }
    }

    return NextResponse.json({ sent, failed, skips })

  } catch (error: any) {
    console.error("Auto-Send Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
