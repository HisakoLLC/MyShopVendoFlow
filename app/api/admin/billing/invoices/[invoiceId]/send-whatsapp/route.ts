import { NextResponse } from "next/server"
import { getServerAdminUser } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { generateInvoicePdf, type InvoiceData } from "@/lib/admin/generateInvoicePdf"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

const WHATSAPP_ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

// Helper: format a Date or ISO string as "Jan 1, 2025"
function fmt(val: string | Date | null | undefined): string {
  if (!val) return "—"
  return new Date(val).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    // ── 1. Auth ─────────────────────────────────────────────────────────────
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { error: "WhatsApp credentials not configured on server" },
        { status: 500 }
      )
    }

    const { invoiceId } = await params
    const { conversationId } = await req.json()

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
    }

    // ── 2. Fetch invoice ─────────────────────────────────────────────────────
    const { data: invoice, error: invErr } = await (supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("invoices") as any)
      .select(
        `id, invoice_number, amount_usd, amount_kes, status, due_date,
         paid_at, period_start, period_end, notes, pdf_url, account_id`
      )
      .eq("id", invoiceId)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status === "void") {
      return NextResponse.json({ error: "Cannot send a void invoice" }, { status: 422 })
    }

    // Fetch merchant
    const { data: merchant } = await supabaseAdmin
      .from("accounts")
      .select("business_name, owner_email, plan_tier")
      .eq("account_id", invoice.account_id)
      .single()

    const merchantName = merchant?.business_name ?? "Merchant"

    // ── 3. Ensure PDF exists ─────────────────────────────────────────────────
    // If no pdf_url, generate the PDF inline right now.
    let storagePath = `${invoice.invoice_number}.pdf`
    let pdfBytes: Uint8Array

    if (!invoice.pdf_url) {
      const invoiceData: InvoiceData = {
        invoiceNumber: invoice.invoice_number,
        merchantName,
        merchantEmail: merchant?.owner_email   ?? "",
        planTier:      merchant?.plan_tier     ?? "starter",
        billingCycle:  "Monthly",
        periodStart:   fmt(invoice.period_start),
        periodEnd:     fmt(invoice.period_end),
        amountUsd:     invoice.amount_usd  ?? undefined,
        amountKes:     invoice.amount_kes  ?? undefined,
        dueDate:       fmt(invoice.due_date),
        isPaid:        invoice.status === "paid",
        paidAt:        invoice.paid_at ? fmt(invoice.paid_at) : undefined,
        notes:         invoice.notes   ?? undefined,
      }

      pdfBytes = generateInvoicePdf(invoiceData)

      await supabaseAdmin.storage.createBucket("invoices", {
        public: false,
        allowedMimeTypes: ["application/pdf"],
      })

      await supabaseAdmin.storage
        .from("invoices")
        .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true })

      // Persist the signed URL back to the invoice row
      const { data: signed } = await supabaseAdmin.storage
        .from("invoices")
        .createSignedUrl(storagePath, 86400)

      if (signed?.signedUrl) {
        await (supabaseAdmin
          .schema(ADMIN_SCHEMA as any)
          .from("invoices") as any)
          .update({
            pdf_url:          signed.signedUrl,
            pdf_generated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId)
      }
    } else {
      // ── 4. Fetch PDF bytes from Storage ──────────────────────────────────
      const { data: fileData, error: dlErr } = await supabaseAdmin.storage
        .from("invoices")
        .download(storagePath)

      if (dlErr || !fileData) {
        // File may have expired from storage; regenerate
        const invoiceData: InvoiceData = {
          invoiceNumber: invoice.invoice_number,
          merchantName,
          merchantEmail: merchant?.owner_email ?? "",
          planTier:      merchant?.plan_tier   ?? "starter",
          billingCycle:  "Monthly",
          periodStart:   fmt(invoice.period_start),
          periodEnd:     fmt(invoice.period_end),
          amountUsd:     invoice.amount_usd ?? undefined,
          amountKes:     invoice.amount_kes ?? undefined,
          dueDate:       fmt(invoice.due_date),
          isPaid:        invoice.status === "paid",
          paidAt:        invoice.paid_at ? fmt(invoice.paid_at) : undefined,
          notes:         invoice.notes   ?? undefined,
        }
        pdfBytes = generateInvoicePdf(invoiceData)
        await supabaseAdmin.storage
          .from("invoices")
          .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true })
      } else {
        pdfBytes = new Uint8Array(await fileData.arrayBuffer())
      }
    }

    // ── 5. Upload PDF to Meta media API ──────────────────────────────────────
    const formData = new FormData()
    // Copy bytes into a fresh ArrayBuffer to satisfy strict Blob/BlobPart types
    const safeBuffer = new ArrayBuffer(pdfBytes!.byteLength)
    new Uint8Array(safeBuffer).set(pdfBytes!)
    formData.append(
      "file",
      new Blob([safeBuffer], { type: "application/pdf" }),
      `${invoice.invoice_number}.pdf`
    )
    formData.append("type", "application/pdf")
    formData.append("messaging_product", "whatsapp")

    const mediaRes = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
        body: formData,
      }
    )

    const mediaJson = await mediaRes.json()
    if (!mediaRes.ok || !mediaJson.id) {
      console.error("[send-whatsapp] Meta media upload failed:", mediaJson)
      return NextResponse.json(
        { error: "Failed to upload PDF to WhatsApp media API", details: mediaJson },
        { status: 502 }
      )
    }

    const mediaId = mediaJson.id as string

    // ── 6. Determine template + parameters ───────────────────────────────────
    const isPaid = invoice.status === "paid"

    // Format amount for display
    const amountLabel = invoice.amount_kes != null
      ? `KES ${Number(invoice.amount_kes).toFixed(2)}`
      : invoice.amount_usd != null
        ? `$${Number(invoice.amount_usd).toFixed(2)}`
        : "—"

    const templateName   = isPaid ? "subscription_receipt" : "overdue_invoice_reminder"
    const bodyParameters = isPaid
      ? [
          { type: "text", text: merchantName },
        ]
      : [
          { type: "text", text: merchantName           },
          { type: "text", text: invoice.invoice_number },
          { type: "text", text: amountLabel            },
          { type: "text", text: fmt(invoice.due_date)  },
        ]

    // ── 7. Send via Meta Cloud API (document header + template body) ─────────
    // Fetch conversation phone number
    const { data: conversation, error: convErr } = await (supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("whatsapp_conversations") as any)
      .select("contact_phone")
      .eq("id", conversationId)
      .single()

    if (convErr || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const waPayload = {
      messaging_product: "whatsapp",
      recipient_type:    "individual",
      to:                conversation.contact_phone,
      type:              "template",
      template: {
        name:     templateName,
        language: { code: "en_US" },
        components: [
          // Document header carrying the PDF
          {
            type:       "header",
            parameters: [
              {
                type:     "document",
                document: {
                  id:       mediaId,
                  filename: `${invoice.invoice_number}.pdf`,
                },
              },
            ],
          },
          // Body with dynamic parameters
          {
            type:       "body",
            parameters: bodyParameters,
          },
        ],
      },
    }

    const sendRes = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waPayload),
      }
    )

    const sendJson = await sendRes.json()
    if (!sendRes.ok) {
      console.error("[send-whatsapp] Meta send failed:", sendJson)
      return NextResponse.json(
        { error: "WhatsApp send failed", details: sendJson },
        { status: 502 }
      )
    }

    // ── 8. Update invoice row ─────────────────────────────────────────────────
    await (supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("invoices") as any)
      .update({
        whatsapp_sent_at:          new Date().toISOString(),
        whatsapp_conversation_id:  conversationId,
      })
      .eq("id", invoiceId)

    // ── 9. Return ────────────────────────────────────────────────────────────
    return NextResponse.json({
      success:       true,
      messageId:     sendJson.messages?.[0]?.id,
      templateUsed:  templateName,
      invoiceNumber: invoice.invoice_number,
    })
  } catch (err: any) {
    console.error("[send-whatsapp] Unexpected error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
