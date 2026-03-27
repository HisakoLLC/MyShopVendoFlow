import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "vendoflow_secure_v1"

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

async function downloadMedia(mediaId: string): Promise<{ buffer: Buffer, contentType: string, fileName: string } | null> {
  try {
    // 1. Get Media URL from Meta
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}` }
    })
    const metaData = await metaRes.json()
    if (!metaRes.ok || !metaData.url) return null

    // 2. Download binary data
    const mediaRes = await fetch(metaData.url, {
      headers: { "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}` }
    })
    if (!mediaRes.ok) return null

    const buffer = Buffer.from(await mediaRes.arrayBuffer())
    const contentType = mediaRes.headers.get("content-type") || "application/octet-stream"
    
    // Guess extension if possible, or use a default
    const ext = contentType.split("/")[1]?.split(";")[0] || "bin"
    const fileName = `${mediaId}.${ext}`

    return { buffer, contentType, fileName }
  } catch (err) {
    console.error("Media download error:", err)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // 1. Validate Meta Structure
    if (!body.object || !body.entry?.[0]?.changes?.[0]?.value) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const value = body.entry[0].changes[0].value
    const messages = value.messages
    const contacts = value.contacts

    if (!messages || messages.length === 0) {
      // Could be a status update (delivered/read)
      const statuses = value.statuses
      if (statuses && statuses.length > 0) {
        for (const status of statuses) {
          await supabaseAdmin
            .schema("vendo_admin" as any)
            .from("whatsapp_messages")
            .update({ status: status.status })
            .eq("meta_message_id", status.id)
        }
      }
      return NextResponse.json({ success: true, type: "status_update" })
    }

    // 2. Process incoming messages
    for (const msg of messages) {
      const from = msg.from
      const formattedPhone = from.startsWith("+") ? from : `+${from}`
      const contact = contacts?.find((c: any) => c.wa_id === from)
      const contactName = contact?.profile?.name || null

      // 3. Find or Create Conversation
      let { data: conversation, error: convError } = await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", formattedPhone)
        .single()

      if (convError || !conversation) {
        // Create new conversation if not found
        const { data: newConv, error: createError } = await supabaseAdmin
          .schema("vendo_admin" as any)
          .from("whatsapp_conversations")
          .insert({
            contact_phone: formattedPhone,
            contact_name: contactName,
            status: "open",
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single()

        if (createError) {
          console.error("Error creating conversation:", createError)
          continue
        }
        conversation = newConv
      }

      // 4. Determine Message Content & Media
      let content = ""
      let mediaUrl = null
      let mimeType = null
      let fileName = null
      let fileSize = null

      const mediaTypes = ["image", "document", "video", "audio", "voice"]
      if (msg.type === "text") {
        content = msg.text.body
      } else if (mediaTypes.includes(msg.type)) {
        const mediaObj = msg[msg.type]
        const mediaId = mediaObj.id
        content = mediaObj.caption || `[${msg.type.toUpperCase()}]`
        fileName = mediaObj.filename || `${mediaId}`
        
        // Attempt to download and store
        const downloaded = await downloadMedia(mediaId)
        if (downloaded) {
          const storagePath = `inbound/${conversation.id}/${downloaded.fileName}`
          const { error: uploadError } = await supabaseAdmin.storage
            .from("whatsapp-media")
            .upload(storagePath, downloaded.buffer, {
               contentType: downloaded.contentType,
               upsert: true
            })
          
          if (!uploadError) {
            const { data: publicData } = supabaseAdmin.storage.from("whatsapp-media").getPublicUrl(storagePath)
            mediaUrl = publicData.publicUrl
            mimeType = downloaded.contentType
            fileSize = downloaded.buffer.length
          }
        }
      } else {
        content = `[${msg.type.toUpperCase()} Message]`
      }

      // 5. Save Message
      const { error: msgError } = await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("whatsapp_messages")
        .insert({
          conversation_id: conversation.id,
          meta_message_id: msg.id,
          direction: "inbound",
          message_type: msg.type === "text" ? "text" : (msg.type === "voice" ? "voice" : (msg.type === "audio" ? "audio" : (msg.type === "video" ? "video" : msg.type))),
          content: content,
          status: "read",
          media_url: mediaUrl,
          mime_type: mimeType,
          file_name: fileName,
          file_size: fileSize
        })

      if (msgError) {
        console.error("Error saving incoming message:", msgError)
      }

      // 6. Update Conversation
      const snippet = mediaUrl ? `📎 ${fileName || 'Attachment'}` : content
      await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("whatsapp_conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          unread_count: 1,
          last_message_content: snippet.length > 60 ? snippet.substring(0, 57) + "..." : snippet
        })
        .eq("id", conversation.id)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
