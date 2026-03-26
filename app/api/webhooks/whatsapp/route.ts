import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "vendoflow_secure_v1"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED")
    return new Response(challenge, { status: 200 })
  }

  return new Response("Forbidden", { status: 403 })
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
      const from = msg.from // Phone number with country code
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

      // 4. Determine Message Content
      let content = ""
      if (msg.type === "text") {
        content = msg.text.body
      } else if (msg.type === "image") {
        content = "[Image Message]"
      } else if (msg.type === "document") {
        content = "[Document Message]"
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
          message_type: msg.type === "text" ? "text" : "image", // simplified mapping
          content: content,
          status: "sent", // received messages are technically 'sent' from the user's perspective
        })

      if (msgError) {
        console.error("Error saving incoming message:", msgError)
      }

      // 6. Update Conversation (unread count and timestamp)
      await supabaseAdmin
        .schema("vendo_admin" as any)
        .from("whatsapp_conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          unread_count: 1 // For now just set to 1, or increment
        })
        .eq("id", conversation.id)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
