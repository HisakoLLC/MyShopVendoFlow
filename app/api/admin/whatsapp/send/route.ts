import { NextResponse } from "next/server"
import { getServerAdminUser } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { hasPermission } from "@/lib/admin/permissions"
import { sendWhatsAppMessage } from "@/lib/admin/whatsapp-helper"

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
      .schema("admin" as any)
      .from("whatsapp_conversations")
      .select("contact_phone")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

    // 4. Handle Internal Note
    if (isInternalNote) {
      const { error: noteError } = await supabaseAdmin
        .schema("admin" as any)
        .from("internal_notes")
        .insert({
          conversation_id: conversationId,
          author_id: adminUser.id,
          content: content || "📎 Attachment (Note)"
        })

      if (noteError) throw noteError
      
      // Also save as system message for real-time history
      await supabaseAdmin.schema("admin" as any).from("whatsapp_messages").insert({
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
        .schema("admin" as any)
        .from("whatsapp_conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_content: `📝 Note: ${snippet.length > 50 ? snippet.substring(0, 47) + "..." : snippet}`
        })
        .eq("id", conversationId)

      return NextResponse.json({ success: true, type: "internal_note" })
    }

    // 5. Send WhatsApp Message via Helper
    const { ok, result } = await sendWhatsAppMessage({
      phone: conversation.contact_phone,
      type,
      content,
      templateName,
      templateParams,
      mediaUrl,
      fileName
    })

    if (!ok) {
      console.error("Meta API error:", result)
      // Save failed message
      await supabaseAdmin.schema("admin" as any).from("whatsapp_messages").insert({
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
    await supabaseAdmin.schema("admin" as any).from("whatsapp_messages").insert({
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
      .schema("admin" as any)
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
