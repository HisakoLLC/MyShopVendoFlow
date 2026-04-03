import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import WhatsappClient, { WhatsappConversation } from "../_components/whatsapp/WhatsappClient"
import WhatsappLoading from "./loading"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function WhatsappData({ merchantId }: { merchantId?: string }) {
  // 1. Fetch conversations with agent info
  const { data: conversations, error } = await supabaseAdmin
    .schema(ADMIN_SCHEMA as any)
    .from("whatsapp_conversations")
    .select(`
      *,
      assigned_agent:admin_users(id, full_name, avatar_url)
    `)
    .order("last_message_at", { ascending: false })

  // 2. Fetch Merchants separately to avoid cross-schema join failure
  const { data: merchants } = await supabaseAdmin
    .from("accounts")
    .select("account_id, business_name")

  if (error) {
    console.error("Error fetching whatsapp conversations:", error)
    return <div className="p-8 text-red-500">Failed to load conversations.</div>
  }

  // 3. Map data to client type
  const mappedConversations: WhatsappConversation[] = (conversations || []).map((c: any) => ({
    id: c.id,
    contact_name: c.contact_name,
    contact_phone: c.contact_phone,
    status: c.status,
    unread_count: c.unread_count || 0,
    last_message_at: c.last_message_at,
    last_message_content: c.last_message_content,
    merchant_id: c.merchant_id,
    assigned_agent_id: c.assigned_agent_id,
    assigned_agent: c.assigned_agent,
    accounts: {
      business_name: merchants?.find(m => m.account_id === c.merchant_id)?.business_name || "Unknown Merchant"
    }
  }))

  return (
    <WhatsappClient 
      initialConversations={mappedConversations} 
      merchantId={merchantId} 
      merchants={merchants || []}
    />
  )
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
