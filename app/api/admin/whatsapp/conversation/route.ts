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

    // Join with assigned_agent (both in admin schema)
    const { data, error } = await supabaseAdmin
      .schema("admin" as any)
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

    const { status, assigned_agent_id, contact_name, tags, notes, merchant_id } = await req.json()

    // Fetch old values for logging
    const { data: oldData } = await supabaseAdmin
      .schema("admin" as any)
      .from("whatsapp_conversations")
      .select("status, assigned_agent_id")
      .eq("id", conversationId)
      .single()

    const updateData: any = {}
    if (status) updateData.status = status
    if (assigned_agent_id !== undefined) updateData.assigned_agent_id = assigned_agent_id
    if (contact_name !== undefined) updateData.contact_name = contact_name
    if (tags !== undefined) updateData.tags = tags
    if (notes !== undefined) updateData.notes = notes
    if (merchant_id !== undefined) updateData.merchant_id = merchant_id

    const { data, error } = await supabaseAdmin
      .schema("admin" as any)
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
        .schema("admin" as any)
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
        .schema("admin" as any)
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

export async function POST(req: Request) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phone, merchantId, contactName } = await req.json()
    if (!phone) {
      return NextResponse.json({ error: "Missing phone number" }, { status: 400 })
    }

    // Clean phone number (Keep +, digits)
    const cleanPhone = phone.replace(/[^\d+]/g, "")

    // Check if exists
    const { data: existing } = await supabaseAdmin
      .schema("admin" as any)
      .from("whatsapp_conversations")
      .select(`
        *,
        assigned_agent:assigned_agent_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("contact_phone", cleanPhone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ conversation: existing, isNew: false })
    }

    // Create new
    const { data: created, error: createError } = await supabaseAdmin
      .schema("admin" as any)
      .from("whatsapp_conversations")
      .insert({
        contact_phone: cleanPhone,
        contact_name: contactName || "New Contact",
        status: "open",
        merchant_id: merchantId,
        last_message_at: new Date().toISOString()
      })
      .select(`
        *,
        assigned_agent:assigned_agent_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (createError) {
      console.error("[CONVERSATION_POST_ERROR]", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Log creation
    await supabaseAdmin
      .schema("admin" as any)
      .from("whatsapp_activity_log")
      .insert({
        conversation_id: created.id,
        author_id: adminUser.id,
        activity_type: "status_change",
        new_value: "open",
        old_value: null
      })

    return NextResponse.json({ conversation: created, isNew: true })
  } catch (error: any) {
    console.error("[CONVERSATION_POST_CRASH]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
