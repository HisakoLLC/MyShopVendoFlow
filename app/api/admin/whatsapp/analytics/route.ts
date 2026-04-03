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
    const period = searchParams.get("period") || "7d"
    
    // 1. Calculate date range
    const days = parseInt(period) || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString()

    // 2. Aggregate Messages (Sent vs Received)
    const { data: messages, error: msgError } = await supabaseAdmin
      .schema("admin" as any)
      .from("whatsapp_messages")
      .select("direction, created_at, message_type, content")
      .gte("created_at", startDateStr)

    if (msgError) throw msgError

    const sent = messages.filter(m => m.direction === 'outbound').length
    const received = messages.filter(m => m.direction === 'inbound').length
    const responseRate = sent > 0 ? (received / sent) * 100 : 0

    // 3. Daily Volume (Recharts format)
    const dailyMap = new Map()
    messages.forEach(m => {
      const date = new Date(m.created_at).toISOString().split('T')[0]
      if (!dailyMap.has(date)) dailyMap.set(date, { date, sent: 0, received: 0 })
      const entry = dailyMap.get(date)
      if (m.direction === 'outbound') entry.sent++
      else entry.received++
    })
    const dailyVolume = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // 4. Template Usage
    const templateMap = new Map()
    messages.filter(m => m.message_type === 'template').forEach(m => {
      const name = m.content?.template_name || 'unknown'
      templateMap.set(name, (templateMap.get(name) || 0) + 1)
    })
    const templateUsage = Array.from(templateMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 5. Conversation Status
    const { data: convs } = await supabaseAdmin
      .schema("admin" as any)
      .from("whatsapp_conversations")
      .select("status")
    
    const statusMap = new Map()
    convs?.forEach(c => {
      statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1)
    })
    const conversationStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))

    // 6. Recent Broadcasts
    const { data: recentBroadcasts } = await supabaseAdmin
      .schema("admin" as any)
      .from("broadcasts")
      .select("*")
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(10)

    return NextResponse.json({
      stats: {
        sent,
        received,
        activeConversations: convs?.length || 0,
        responseRate: Number(responseRate.toFixed(1))
      },
      dailyVolume,
      templateUsage,
      conversationStatus,
      recentBroadcasts
    })

  } catch (err: any) {
    console.error("[analytics] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
