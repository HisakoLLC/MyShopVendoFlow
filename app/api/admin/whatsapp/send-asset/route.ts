import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { conversationId, assetType, assetId } = await req.json()

    if (!conversationId || !assetType || !assetId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Fetch asset details (invoice or report)
    let content = ""
    let mediaUrl = ""
    let fileName = ""

    if (assetType === "report") {
      const { data: report } = await supabaseAdmin
        .schema(ADMIN_SCHEMA as any)
        .from("reports")
        .select("*")
        .eq("id", assetId)
        .single()
      
      if (!report) throw new Error("Report not found")
      content = `Here is your ${report.report_type.replace('_', ' ')} for ${new Date(report.created_at).toLocaleDateString()}.`
      // In a real system, we'd generate a temporary signed URL to the PDF/Excel
      mediaUrl = `https://myshopvendoflow.com/api/reports/${assetId}/pdf` 
      fileName = `${report.report_type}_${assetId.slice(0,8)}.pdf`
    } else if (assetType === "invoice") {
      const { data: invoice } = await supabaseAdmin
        .schema(ADMIN_SCHEMA as any)
        .from("invoices")
        .select("*")
        .eq("id", assetId)
        .single()

      if (!invoice) throw new Error("Invoice not found")
      content = `Reminder: Invoice ${invoice.invoice_number} for KES ${invoice.amount_kes} is pending.`
      mediaUrl = `https://myshopvendoflow.com/api/admin/billing/invoices/${assetId}/pdf`
      fileName = `INV_${invoice.invoice_number}.pdf`
    }

    // 2. Fetch conversation to get contact phone
    const { data: conv } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("whatsapp_conversations")
      .select("contact_phone")
      .eq("id", conversationId)
      .single()

    if (!conv) throw new Error("Conversation not found")

    // 3. Send message via WhatsApp API (Mock or Real)
    // For this implementation, we'll just insert into whatsapp_messages 
    // which our background worker picks up to send to the provider.
    
    const { data: message, error: msgErr } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        direction: "outbound",
        message_type: "document",
        content: { text: content },
        media_url: mediaUrl,
        file_name: fileName,
        mime_type: "application/pdf",
        status: "sent"
      })
      .select()
      .single()

    if (msgErr) throw msgErr

    // 4. Update conversation last message
    await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_content: content
      })
      .eq("id", conversationId)

    return NextResponse.json({ success: true, message })
  } catch (err: any) {
    console.error("[send-asset] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

