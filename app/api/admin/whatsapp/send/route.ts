import { NextResponse } from "next/server"
import { getServerAdminUser } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { PERMISSIONS, hasPermission } from "@/lib/admin/permissions"

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

export async function POST(req: Request) {
  try {
    // 1. Verify custom Admin Session
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized: Admin access only" }, { status: 401 })
    }

    // 2. Verify Role-Based Permission
    if (!hasPermission(adminUser.role, 'whatsapp_send')) {
      return NextResponse.json({ 
        error: "Permission Denied", 
        detail: `Role '${adminUser.role}' is not authorized to send messages.` 
      }, { status: 403 })
    }

    const { 
      conversationId, 
      type, 
      content, 
      templateName, 
      templateParams, 
      isInternalNote 
    } = await req.json()

    if (!conversationId) return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 })

    // 3. Fetch Conversation for Phone Number
    const { data: conversation, error: convError } = await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("whatsapp_conversations")
      .select("contact_phone")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

    // 4. Handle Internal Note
    if (isInternalNote) {
      const { error: noteError } = await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("internal_notes")
        .insert({
          conversation_id: conversationId,
          author_id: adminUser.id,
          content: content
        })

      if (noteError) throw noteError
      
      // Also save as system message for real-time history
      await supabaseAdmin.schema("vendo_admin" as any).from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        message_type: "system",
        content: content,
        sent_by_id: adminUser.id
      })

      // Update conversation snippet
      await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("whatsapp_conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_content: `📝 Note: ${content.length > 50 ? content.substring(0, 47) + "..." : content}`
        })
        .eq("id", conversationId)

      return NextResponse.json({ success: true, type: "internal_note" })
    }

    // 5. Send WhatsApp Message
    let payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.contact_phone,
    }

    if (type === "template") {
      payload.type = "template"
      payload.template = {
        name: templateName,
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: Object.values(templateParams || {}).map(val => ({
              type: "text",
              text: val
            }))
          }
        ]
      }
    } else {
      payload.type = "text"
      payload.text = { body: content }
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error("Meta API error:", result)
      // Save failed message
      await supabaseAdmin.schema("vendo_admin" as any).from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        message_type: type,
        content: type === "text" ? content : `${templateName} (Params: ${JSON.stringify(templateParams)})`,
        status: "failed",
        sent_by_id: adminUser.id
      })
      return NextResponse.json({ error: "WhatsApp Cloud API failed", details: result }, { status: 500 })
    }

    // 7. Save successful message
    await supabaseAdmin.schema("vendo_admin" as any).from("whatsapp_messages").insert({
      conversation_id: conversationId,
      meta_message_id: result.messages?.[0]?.id,
      direction: "outbound",
      message_type: type,
      content: type === "text" ? content : `${templateName}`,
      template_name: type === "template" ? templateName : undefined,
      template_params: type === "template" ? templateParams : undefined,
      status: "sent",
      sent_by_id: adminUser.id
    })

    // 8. Update conversation
    const snippet = type === "text" ? content : `Template: ${templateName}`
    await supabaseAdmin
      .schema("vendo_admin" as any)
      .from("whatsapp_conversations")
      .update({ 
        last_message_at: new Date().toISOString(),
        last_message_content: snippet.length > 60 ? snippet.substring(0, 57) + "..." : snippet
      })
      .eq("id", conversationId)

    return NextResponse.json({ success: true, message_id: result.messages?.[0]?.id })

  } catch (error: any) {
    console.error("WhatsApp Route Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
