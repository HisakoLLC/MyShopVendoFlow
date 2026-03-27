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

    // Join with assigned_agent (both in vendo_admin schema)
    const { data, error } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("whatsapp_conversations")
      .select(`
        *,
        assigned_agent:assigned_agent_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("id", conversationId)
      .single()

    if (error) {
      console.error("[CONVERSATION_API_ERROR]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversation: data })
  } catch (error: any) {
    console.error("[CONVERSATION_API_CRASH]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
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

    const body = await req.json()
    const { status, assigned_agent_id } = body

    // Fetch old values for logging
    const { data: oldData } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("whatsapp_conversations")
      .select("status, assigned_agent_id")
      .eq("id", conversationId)
      .single()

    const updateData: any = {}
    if (status) updateData.status = status
    if (assigned_agent_id !== undefined) updateData.assigned_agent_id = assigned_agent_id

    const { data, error } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("whatsapp_conversations")
      .update(updateData)
      .eq("id", conversationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log the change
    if (status && status !== oldData?.status) {
      await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("whatsapp_activity_log")
        .insert({
          conversation_id: conversationId,
          author_id: adminUser.id,
          activity_type: "status_change",
          old_value: oldData?.status,
          new_value: status
        })
    }

    if (assigned_agent_id !== undefined && assigned_agent_id !== oldData?.assigned_agent_id) {
      await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("whatsapp_activity_log")
        .insert({
          conversation_id: conversationId,
          author_id: adminUser.id,
          activity_type: "assignment",
          old_value: oldData?.assigned_agent_id,
          new_value: assigned_agent_id
        })
    }

    return NextResponse.json({ conversation: data })
  } catch (error: any) {
    console.error("[CONVERSATION_PATCH_CRASH]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
