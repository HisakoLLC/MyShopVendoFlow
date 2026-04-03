import { notFound } from "next/navigation"
import Link from "next/link"
import { 
  ChevronLeft, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  Store as StoreIcon,
  Users,
  Settings as SettingsIcon,
  Globe,
  Pencil
} from "lucide-react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import MerchantTabs from "./_components/MerchantTabs"
import { Suspense } from "react"
import MerchantDetailLoading from "./loading"
import { getServerAdminUser } from "@/lib/admin/auth"
import { EditMerchantSheet, AccountActions } from "../../_components/merchants"
import HealthSignalsPanel from "../../_components/merchants/HealthSignalsPanel"
import MerchantDetailHeader from "./_components/MerchantDetailHeader"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function MerchantDetailData({ id, initialTab }: { id: string; initialTab: string }) {
  // 1. Fetch Auth User + Account + Metadata
  const adminUser = await getServerAdminUser()
  if (!adminUser) return notFound()

  const [
    { data: account, error: accountError },
    { data: stores },
    { data: staff },
    { data: settings },
    { data: sales },
    { data: styles },
    { data: pos },
    { data: conversations },
    { data: reports }
  ] = await Promise.all([
    supabaseAdmin.from("accounts").select("*").eq("account_id", id).single(),
    supabaseAdmin.from("stores").select("*").eq("account_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("staff").select("*").eq("account_id", id).order("role", { ascending: true }),
    supabaseAdmin.from("business_settings").select("*").eq("account_id", id).single(),
    supabaseAdmin.from("sales").select("*, stores(name, account_id)").order("sale_date", { ascending: false }),
    supabaseAdmin.from("product_styles").select(`
      *,
      categories(name),
      product_variants(count)
    `).eq("account_id", id),
    supabaseAdmin.from("purchase_orders").select("*, suppliers(name)").eq("account_id", id).order("order_date", { ascending: false }),
    supabaseAdmin.schema("vendo_admin" as any).from("whatsapp_conversations").select("*").eq("merchant_id", id).order("last_message_at", { ascending: false }),
    supabaseAdmin.schema("vendo_admin" as any).from("reports").select("*").eq("merchant_id", id).order("created_at", { ascending: false })
  ])

  if (accountError || !account) {
    notFound()
  }

  // 2. Aggregate Data (Simplified for display)
  const merchantSales = sales?.filter((s) => (s.stores as any)?.account_id === id) || []
  const totalRevenue = merchantSales.reduce((acc, s) => acc + Number(s.grand_total), 0)
  const totalTransactions = merchantSales.length
  const avgBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const lastSaleDate = merchantSales.length > 0 ? merchantSales[0].sale_date : null

  const styleIds = styles?.map(s => s.style_id) || []
  const lowStockCount = 0 // Placeholder logic for now

  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto pb-24">
      {/* Header (Client-side interactivity moved to separate component) */}
      <MerchantDetailHeader 
        account={account} 
        userRole={adminUser.role} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Merchant Profile Card + Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-6 space-y-8 divide-y divide-[#1f1f1f]">
            {/* Account Meta */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#444] text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" />
                Account Details
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#161616] border border-[#1f1f1f] flex items-center justify-center text-white font-bold text-lg">
                    {account.business_name?.[0]}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{account.business_name}</div>
                    <div className="text-[10px] text-[#444] font-mono">{account.account_id}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Specific Metadata (City/Country/Phone) */}
            <div className="pt-8 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[9px] text-[#444] uppercase font-bold tracking-tighter">Location</div>
                  <div className="text-xs text-white truncate">
                    {account.city || "No City"}, {account.country || "KE"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] text-[#444] uppercase font-bold tracking-tighter">Verified Phone</div>
                  <div className="text-xs text-white font-mono">{account.phone || "Not set"}</div>
                </div>
              </div>
            </div>

            <AccountActions 
              accountId={id}
              merchantId={id}
              merchantName={account.business_name}
              ownerEmail={account.owner_email}
              subscriptionStatus={account.subscription_status}
              userRole={adminUser.role}
              onRefresh={async () => {
                // Next.js server components can't be easily refreshed from children without page reload or router.refresh()
                // The AccountActions component will trigger Window.location.reload() or router.refresh() if client side
              }}
            />

            <HealthSignalsPanel accountId={id} />
          </div>

          {/* Stores List */}
          <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-6 space-y-4">
             <div className="flex items-center gap-2 text-[#444] text-[10px] font-bold uppercase tracking-widest">
                <StoreIcon className="w-3 h-3" />
                Stores ({stores?.length || 0})
              </div>
              <div className="space-y-2">
                {stores?.map((store) => (
                  <div key={store.store_id} className="p-3 rounded bg-[#161616] border border-[#1f1f1f] flex justify-between items-center group hover:border-white/10 transition-colors">
                    <div>
                      <div className="text-xs text-white font-medium">{store.name}</div>
                      <div className="text-[10px] text-[#444] truncate max-w-[150px]">{store.address || "No address"}</div>
                    </div>
                    {store.active && <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Content */}
        <div className="lg:col-span-2">
          <MerchantTabs 
            merchantId={id}
            initialTab={initialTab}
            sales={{
              metrics: { totalRevenue, totalTransactions, avgBasket, lastSaleDate },
              history: merchantSales.slice(0, 20)
            }}
            inventory={{
              metrics: { totalStyles: styles?.length || 0, totalVariants: styles?.reduce((acc, s) => acc + (s.product_variants?.[0]?.count || 0), 0) || 0, lowStockCount, deadStockCount: 0 },
              styles: styles || []
            }}
            purchaseOrders={pos || []}
            whatsapp={conversations || []}
            reports={reports || []}
          />
        </div>
      </div>
    </div>
  )
}

export default async function MerchantDetailPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id }  = await params
  const { tab } = await searchParams
  const initialTab = tab ?? "billing"
  return (
    <Suspense fallback={<MerchantDetailLoading />}>
      <MerchantDetailData id={id} initialTab={initialTab} />
    </Suspense>
  )
}
