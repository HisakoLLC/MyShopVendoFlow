import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin access
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("admin_users")
      .select("id, is_active")
      .eq("email", session.user.email)
      .single()

    if (adminError || !adminUser || !adminUser.is_active) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 })
    }

    // 1. Fetch Whatsapp Messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (msgError) throw msgError

    // 2. Fetch Internal Notes
    const { data: notes, error: noteError } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("internal_notes")
      .select(`
        *,
        author:admin_users(full_name)
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (noteError) throw noteError

    // 3. Merge and Sort Timeline
    const formattedMessages = (messages || []).map(m => ({
      ...m,
      type: "whatsapp_message"
    }))

    const formattedNotes = (notes || []).map(n => ({
      id: n.id,
      conversation_id: n.conversation_id,
      created_at: n.created_at,
      type: "internal_note",
      content: { text: n.content },
      author_name: (n.author as any)?.full_name || "Unknown Agent"
    }))

    const mergedTimeline = [...formattedMessages, ...formattedNotes].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    return NextResponse.json({ messages: mergedTimeline })

  } catch (error: any) {
    console.error("WhatsApp Messages API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
