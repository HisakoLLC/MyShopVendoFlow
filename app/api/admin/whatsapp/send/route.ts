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
      isInternalNote,
      mediaUrl,
      fileName,
      mimeType,
      fileSize
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
          content: content || "📎 Attachment (Note)"
        })

      if (noteError) throw noteError
      
      // Also save as system message for real-time history
      await supabaseAdmin.schema("vendo_admin" as any).from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        message_type: mediaUrl ? (mimeType?.includes("image") ? "image" : "document") : "system",
        content: content,
        sent_by_id: adminUser.id,
        media_url: mediaUrl,
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize
      })

      // Update conversation snippet
      const snippet = content || (mediaUrl ? "📎 Attachment" : "Note")
      await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("whatsapp_conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_content: `📝 Note: ${snippet.length > 50 ? snippet.substring(0, 47) + "..." : snippet}`
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
    } else if (type === "image") {
      payload.type = "image"
      payload.image = { link: mediaUrl, caption: content }
    } else if (type === "document") {
      payload.type = "document"
      payload.document = { link: mediaUrl, caption: content, filename: fileName }
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
        content: type === "text" ? content : (type === "template" ? `${templateName}` : (content || fileName)),
        status: "failed",
        sent_by_id: adminUser.id,
        media_url: mediaUrl,
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize
      })
      return NextResponse.json({ error: "WhatsApp Cloud API failed", details: result }, { status: 500 })
    }

    // 7. Save successful message
    await supabaseAdmin.schema("vendo_admin" as any).from("whatsapp_messages").insert({
      conversation_id: conversationId,
      meta_message_id: result.messages?.[0]?.id,
      direction: "outbound",
      message_type: type,
      content: type === "text" ? content : (type === "template" ? `${templateName}` : (content || fileName)),
      template_name: type === "template" ? templateName : undefined,
      template_params: type === "template" ? templateParams : undefined,
      status: "sent",
      sent_by_id: adminUser.id,
      media_url: mediaUrl,
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize
    })

    // 8. Update conversation
    let snippet = type === "text" ? content : (type === "template" ? `Template: ${templateName}` : `📎 ${fileName || 'Attachment'}`)
    if (!snippet && content) snippet = content
    
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
