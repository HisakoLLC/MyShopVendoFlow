import { notFound } from "next/navigation"
import Link from "next/link"
import { 
  BarChart3, 
  Building2, 
  Calendar, 
  ChevronLeft, 
  Mail, 
  MessageSquare, 
  MoreVertical, 
  ShieldCheck, 
  Store as StoreIcon,
  Users,
  Settings as SettingsIcon,
  Globe
} from "lucide-react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import MerchantTabs from "./_components/MerchantTabs"
import { Suspense } from "react"
import MerchantDetailLoading from "./loading"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function MerchantDetailData({ id }: { id: string }) {
  // 1. Fetch Account + Stores + Staff + Settings in parallel
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
    supabaseAdmin.schema("admin" as any).from("whatsapp_conversations").select("*").eq("merchant_id", id).order("last_message_at", { ascending: false }),
    supabaseAdmin.schema("admin" as any).from("reports").select("*").eq("merchant_id", id).order("created_at", { ascending: false })
  ])

  if (accountError || !account) {
    notFound()
  }

  // 2. Filter Sales for this account (since sales doesn't have account_id, we filter by the store's account_id)
  const merchantSales = sales?.filter((s) => (s.stores as any)?.account_id === id) || []
  const totalRevenue = merchantSales.reduce((acc, s) => acc + Number(s.grand_total), 0)
  const totalTransactions = merchantSales.length
  const avgBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const lastSaleDate = merchantSales.length > 0 ? merchantSales[0].sale_date : null

  // 3. Inventory Aggregation
  // We need to fetch variants and inventory totals for styles
  const styleIds = styles?.map(s => s.style_id) || []
  const [
    { data: variants },
    { data: inventoryLevels }
  ] = await Promise.all([
    supabaseAdmin.from("product_variants").select("variant_id, style_id").in("style_id", styleIds),
    supabaseAdmin.from("inventory_levels").select("variant_id, quantity_on_hand").in("variant_id", (await supabaseAdmin.from("product_variants").select("variant_id").in("style_id", styleIds)).data?.map(v => v.variant_id) || [])
  ])

  // Map inventory totals to styles
  const variantToStyleMap: Record<string, string> = {}
  variants?.forEach(v => { variantToStyleMap[v.variant_id] = v.style_id! })

  const styleInventoryMap: Record<string, number> = {}
  inventoryLevels?.forEach(inv => {
    const styleId = variantToStyleMap[inv.variant_id!]
    if (styleId) {
      styleInventoryMap[styleId] = (styleInventoryMap[styleId] || 0) + (inv.quantity_on_hand || 0)
    }
  })

  const enrichedStyles = styles?.map(s => ({
    ...s,
    inventory_total: styleInventoryMap[s.style_id] || 0
  })) || []

  const lowStockCount = inventoryLevels?.filter(inv => (inv.quantity_on_hand || 0) < 5).length || 0
  // Placeholder for dead stock logic as we'd need variant_metrics join
  const deadStockCount = 0 

  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto pb-24">
      {/* Page Header */}
      <div className="mb-6">
        <Link 
          href="/admin/merchants" 
          className="inline-flex items-center gap-1 text-[#444] hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors mb-4 group"
        >
          <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
          Back to Merchants
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-white text-3xl font-bold tracking-tight">{account.business_name}</h1>
            <div className="flex items-center gap-3 text-[#666] text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {new Date(account.created_at).toLocaleDateString()}
              </span>
              <span>•</span>
              <span className="bg-[#22c55e]/10 text-[#22c55e] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-[#22c55e]/20">
                {account.subscription_status}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href={`/admin/whatsapp?merchant=${id}`}
              className="px-4 py-2 rounded border border-[#1f1f1f] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send WhatsApp
            </Link>
            <button className="p-2 border border-[#1f1f1f] rounded hover:bg-white/5 transition-all text-[#444] hover:text-white">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Merchant Profile Card */}
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

            {/* Stores List */}
            <div className="pt-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#444] text-[10px] font-bold uppercase tracking-widest">
                  <StoreIcon className="w-3 h-3" />
                  Stores ({stores?.length || 0})
                </div>
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

            {/* Staff List */}
            <div className="pt-8 space-y-4">
              <div className="flex items-center gap-2 text-[#444] text-[10px] font-bold uppercase tracking-widest">
                <Users className="w-3 h-3" />
                Key Staff
              </div>
              <div className="space-y-3">
                {staff?.map((s) => (
                  <div key={s.staff_id} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-bold text-[#666] group-hover:text-white transition-colors">
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-medium truncate">{s.first_name} {s.last_name}</span>
                        <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-white/5 text-[#444] border border-white/5">{s.role}</span>
                      </div>
                      <div className="text-[10px] text-[#444] flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5" />
                        <span className="truncate">{s.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Business Settings */}
            <div className="pt-8 space-y-4">
              <div className="flex items-center gap-2 text-[#444] text-[10px] font-bold uppercase tracking-widest">
                <SettingsIcon className="w-3 h-3" />
                Settings
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[9px] text-[#444] uppercase font-bold tracking-tighter">Currency</div>
                  <div className="text-xs text-white flex items-center gap-1.5 font-mono">
                    <Globe className="w-3 h-3 text-[#444]" />
                    {settings?.currency || "KES"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] text-[#444] uppercase font-bold tracking-tighter">Tax ID</div>
                  <div className="text-xs text-white font-mono">{settings?.tax_id || "None set"}</div>
                </div>
              </div>
              <div className="pt-2">
                <div className="text-[9px] text-[#444] uppercase font-bold tracking-tighter mb-1">Receipt Header</div>
                <div className="text-[10px] text-white/50 bg-white/5 p-2 rounded border border-white/5 italic line-clamp-2">
                  {settings?.receipt_header || "Default VendoFlow Header"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Content */}
        <div className="lg:col-span-2">
          <MerchantTabs 
            merchantId={id}
            sales={{
              metrics: {
                totalRevenue,
                totalTransactions,
                avgBasket,
                lastSaleDate
              },
              history: merchantSales.slice(0, 20)
            }}
            inventory={{
              metrics: {
                totalStyles: styles?.length || 0,
                totalVariants: variants?.length || 0,
                lowStockCount,
                deadStockCount
              },
              styles: enrichedStyles
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

export default async function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<MerchantDetailLoading />}>
      <MerchantDetailData id={id} />
    </Suspense>
  )
}
