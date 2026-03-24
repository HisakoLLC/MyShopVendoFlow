import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import WhatsappClient, { WhatsappConversation } from "../_components/whatsapp/WhatsappClient"
import WhatsappLoading from "./loading"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function WhatsappData({ merchantId }: { merchantId?: string }) {
  // 1. Fetch conversations with merchant names
  // We use .schema('admin') for the conversations table
  const { data: conversations, error } = await supabaseAdmin
    .schema("admin" as any)
    .from("whatsapp_conversations")
    .select(`
      *,
      accounts:merchant_id (
        business_name
      )
    `)
    .order("last_message_at", { ascending: false })

  if (error) {
    console.error("Error fetching whatsapp conversations:", error)
    return <div className="p-8 text-red-500">Failed to load conversations.</div>
  }

  // 2. Map data to client type
  const mappedConversations: WhatsappConversation[] = (conversations || []).map((c: any) => ({
    id: c.id,
    contact_name: c.contact_name,
    contact_phone: c.contact_phone,
    status: c.status,
    unread_count: c.unread_count || 0,
    last_message_at: c.last_message_at,
    merchant_id: c.merchant_id,
    accounts: {
      business_name: c.accounts?.business_name || "Unknown Merchant"
    }
  }))

  return <WhatsappClient initialConversations={mappedConversations} merchantId={merchantId} />
}

export default async function WhatsappPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ merchant?: string }> 
}) {
  const { merchant } = await searchParams

  return (
    <Suspense fallback={<WhatsappLoading />}>
      <WhatsappData merchantId={merchant} />
    </Suspense>
  )
}
