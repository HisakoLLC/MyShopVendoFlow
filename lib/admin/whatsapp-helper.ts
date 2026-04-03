import { supabaseAdmin } from "./supabase-admin"

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

export interface WhatsAppSendOptions {
  phone: string
  type: "text" | "template" | "image" | "document"
  content?: string
  templateName?: string
  templateParams?: Record<string, string>
  mediaUrl?: string
  fileName?: string
}

/**
 * Common utility to transmit messages via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppMessage({
  phone,
  type,
  content,
  templateName,
  templateParams,
  mediaUrl,
  fileName
}: WhatsAppSendOptions) {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp configuration missing in environment variables")
  }

  const payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
  }

  if (type === "template") {
    payload.type = "template"
    
    // Map params if object, or use array directly
    const paramsArray = Array.isArray(templateParams) 
      ? templateParams 
      : Object.values(templateParams || {})

    payload.template = {
      name: templateName,
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: paramsArray.map(val => ({
            type: "text",
            text: String(val)
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
  return { ok: response.ok, result, response }
}

/**
 * Ensures a conversation exists for a phone number and merchant
 */
export async function ensureConversation(phone: string, merchantId: string | null) {
  // 1. Check if exists
  const { data: existing } = await supabaseAdmin
    .schema("admin" as any)
    .from("whatsapp_conversations")
    .select("id")
    .eq("contact_phone", phone)
    .maybeSingle()

  if (existing) return existing.id

  // 2. Create if not
  const { data: created, error } = await supabaseAdmin
    .schema("admin" as any)
    .from("whatsapp_conversations")
    .insert({
      contact_phone: phone,
      merchant_id: merchantId,
      status: "open",
      last_message_at: new Date().toISOString()
    })
    .select("id")
    .single()

  if (error) throw error
  return created.id
}
