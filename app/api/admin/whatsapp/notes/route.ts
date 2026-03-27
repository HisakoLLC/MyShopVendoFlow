import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"

export async function GET(req: Request) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("internal_notes")
      .select(`
        *,
        author:author_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[NOTES_GET_ERROR]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notes: data })
  } catch (error: any) {
    console.error("[NOTES_GET_CRASH]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { conversationId, content } = body

    if (!conversationId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("internal_notes")
      .insert({
        conversation_id: conversationId,
        author_id: adminUser.id,
        content
      })
      .select(`
        *,
        author:author_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error("[NOTES_POST_ERROR]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log the activity
    await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("whatsapp_activity_log")
      .insert({
        conversation_id: conversationId,
        author_id: adminUser.id,
        activity_type: "note_added",
        new_value: content.substring(0, 50) + (content.length > 50 ? "..." : "")
      })

    return NextResponse.json({ note: data })
  } catch (error: any) {
    console.error("[NOTES_POST_CRASH]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
