import { Suspense } from "react"
import { 
  Building2, 
  MapPin, 
  TrendingUp, 
  MessageCircle, 
  Package, 
  Layers, 
  AlertTriangle, 
  FileText,
  Clock,
  ShieldAlert,
  UserX
} from "lucide-react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import DashboardLoading from "./loading"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function DashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  // 1. Fetch Section 1: Stat Cards Row
  const [
    { count: totalMerchants },
    { count: activeStores },
    { data: salesTodayData },
    { count: openConversations }
  ] = await Promise.all([
    supabaseAdmin.from("accounts").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("stores").select("*", { count: "exact", head: true }).eq("active", true),
    supabaseAdmin.from("sales").select("grand_total").gte("sale_date", todayStr),
    supabaseAdmin.schema(ADMIN_SCHEMA as any).from("whatsapp_conversations").select("*", { count: "exact", head: true }).eq("status", "open")
  ])

  const revenueToday = salesTodayData?.reduce((acc, sale) => acc + Number(sale.grand_total), 0) || 0

  // 2. Fetch Section 2 (Left): Recent Transactions
  const { data: recentSales } = await supabaseAdmin
    .from("sales")
    .select(`
      receipt_number,
      grand_total,
      payment_method,
      sale_date,
      stores (
        name,
        accounts (
          business_name
        )
      )
    `)
    .order("sale_date", { ascending: false })
    .limit(10)

  // 3. Fetch System Overview Counts (Aggregated)
  const [
    { count: totalProducts },
    { count: totalVariants },
    { count: lowStockCount },
    { count: totalPOs },
    { count: overdueInvoicesCount },
    { count: suspendedAccountsCount },
    { count: atRiskCount }
  ] = await Promise.all([
    supabaseAdmin.from("product_styles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("product_variants").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("inventory_levels").select("*", { count: "exact", head: true }).lt("quantity_on_hand", 5),
    supabaseAdmin.from("purchase_orders").select("*", { count: "exact", head: true }),
    supabaseAdmin.schema(ADMIN_SCHEMA as any).from("invoices").select("*", { count: "exact", head: true }).eq("status", "overdue"),
    supabaseAdmin.from("accounts").select("*", { count: "exact", head: true }).eq("subscription_status", "suspended"),
    supabaseAdmin.schema(ADMIN_SCHEMA as any).from("account_flags").select("*", { count: "exact", head: true }).eq("flag_type", "at_risk")
  ])

  const stats = [
    { label: "TOTAL MERCHANTS", value: totalMerchants || 0, icon: Building2 },
    { label: "ACTIVE STORES", value: activeStores || 0, icon: MapPin },
    { 
      label: "REVENUE TODAY", 
      value: `KES ${revenueToday.toLocaleString()}`, 
      icon: TrendingUp, 
      trend: "text-[#22c55e]" 
    },
    { 
      label: "OPEN CONVERSATIONS", 
      value: openConversations || 0, 
      icon: MessageCircle,
      trend: (openConversations || 0) > 0 ? "text-amber-400" : "text-[#666]"
    },
  ]

  const quickStatsItems = [
    { label: "Total Products", value: totalProducts || 0, icon: Package },
    { label: "Total Variants", value: totalVariants || 0, icon: Layers },
    { label: "Low Stock Variants", value: lowStockCount || 0, icon: AlertTriangle, alert: (lowStockCount || 0) > 0 },
    { label: "Total Purchase Orders", value: totalPOs || 0, icon: FileText },
    { label: "Overdue Invoices", value: overdueInvoicesCount || 0, icon: ShieldAlert, alert: (overdueInvoicesCount || 0) > 0, alertColor: "text-amber-500" },
    { label: "Suspended Accounts", value: suspendedAccountsCount || 0, icon: UserX, alert: (suspendedAccountsCount || 0) > 0, alertColor: "text-red-500" },
    { label: "At Risk Merchants", value: atRiskCount || 0, icon: AlertTriangle, alert: (atRiskCount || 0) > 0, alertColor: "text-red-500" },
  ]

  return (
    <div className="px-8 py-12 md:px-12 max-w-7xl mx-auto space-y-12">
      {/* Page Header */}
      <div>
        <div className="text-[#444] text-[10px] font-black uppercase tracking-[0.4em] mb-2 px-0.5">Corporate Intelligence</div>
        <h1 className="text-white text-5xl font-black tracking-tighter leading-none">OVERVIEW</h1>
        <p className="text-[#333] text-[10px] font-bold uppercase tracking-[0.2em] mt-4 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm p-8 group hover:border-[#22c55e]/30 transition-all">
              <div className="flex justify-between items-start mb-6">
                <span className="text-[#333] text-[9px] tracking-[0.2em] uppercase font-black">
                  {stat.label}
                </span>
                <Icon className="w-3.5 h-3.5 text-[#222] group-hover:text-[#22c55e] transition-colors" />
              </div>
              <div className={`text-3xl font-black tracking-tighter ${stat.trend || "text-white"}`}>
                {stat.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Recent Transactions — Live Feed</h2>
            <button className="text-[#333] hover:text-white text-[9px] uppercase tracking-widest font-black transition-colors">
              FULL LOG →
            </button>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1a1a1a] bg-[#111]">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#333]">Receipt ID</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#333]">Merchant Store</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#333] text-right">Amount</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#333] text-right">Protocol</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#333] text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {recentSales?.map((sale) => (
                    <tr key={sale.receipt_number} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-[10px] font-black text-[#444] font-mono tracking-tighter group-hover:text-[#666]">{sale.receipt_number}</td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-white font-black uppercase">{(sale.stores as any)?.name}</div>
                        <div className="text-[8px] text-[#22c55e] font-black uppercase tracking-tighter">{(sale.stores as any)?.accounts?.business_name}</div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-black text-white text-right">
                        {Number(sale.grand_total).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest border ${
                          sale.payment_method === 'cash' ? 'bg-zinc-500/5 text-zinc-500 border-zinc-500/10' :
                          sale.payment_method === 'card' ? 'bg-blue-500/5 text-blue-500 border-blue-500/10' :
                          'bg-[#22c55e]/5 text-[#22c55e] border-[#22c55e]/10'
                        }`}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-[#333] font-black text-right">
                        {new Date(sale.sale_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: System Overview */}
        <div className="space-y-6">
          <h2 className="text-white text-[10px] font-black uppercase tracking-[0.3em]">System Health — Metrics</h2>
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm p-4 space-y-1">
            {quickStatsItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center justify-between py-3 px-4 hover:bg-white/[0.02] rounded-sm transition-colors group">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-3.5 h-3.5 ${item.alert ? (item.alertColor || "text-amber-500") : "text-[#222] group-hover:text-[#444]"}`} />
                    <span className="text-[#444] text-[9px] font-black uppercase tracking-widest group-hover:text-[#666] transition-colors">{item.label}</span>
                  </div>
                  <span className={`text-[10px] font-black ${item.alert ? (item.alertColor || "text-amber-500") : "text-white"}`}>
                    {item.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardStats />
    </Suspense>
  )
}
