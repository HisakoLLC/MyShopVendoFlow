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
  Clock
} from "lucide-react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
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
    supabaseAdmin.schema("vendo_admin" as any).from("whatsapp_conversations").select("*", { count: "exact", head: true }).eq("status", "open")
  ])

  const revenueToday = salesTodayData?.reduce((acc, sale) => acc + Number(sale.grand_total), 0) || 0

  // 2. Fetch Section 2 (Left): Recent Transactions
  // Join: sales -> stores -> accounts
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

  // 3. Fetch Section 2 (Right): Quick Stats
  const [
    { count: totalProducts },
    { count: totalVariants },
    { count: lowStockCount },
    { count: totalPOs },
    { count: pendingReportsCount }
  ] = await Promise.all([
    supabaseAdmin.from("product_styles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("product_variants").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("inventory_levels").select("*", { count: "exact", head: true }).lt("quantity_on_hand", 5),
    supabaseAdmin.from("purchase_orders").select("*", { count: "exact", head: true }),
    supabaseAdmin.schema("vendo_admin" as any).from("reports").select("*", { count: "exact", head: true }).eq("status", "draft")
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
    { label: "Pending Reports", value: pendingReportsCount || 0, icon: Clock },
  ]

  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-[#666] text-sm flex items-center gap-2 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-[#111] border border-[#1f1f1f] rounded-lg p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[#444] text-[10px] tracking-widest uppercase font-bold">
                  {stat.label}
                </span>
                <Icon className="w-3.5 h-3.5 text-[#444]" />
              </div>
              <div className={`text-2xl font-bold tracking-tight ${stat.trend || "text-white"}`}>
                {stat.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Transactions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-sm font-semibold tracking-tight">Recent Transactions</h2>
            <button className="text-[#444] hover:text-white text-[10px] uppercase tracking-widest font-bold transition-colors">
              View All
            </button>
          </div>

          <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1f1f1f] bg-[#161616]">
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Receipt No</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Store</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Amount</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Method</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {recentSales?.map((sale) => (
                    <tr key={sale.receipt_number} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-white/50">{sale.receipt_number}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-white font-medium">{(sale.stores as any)?.name}</div>
                        <div className="text-[10px] text-[#444]">{(sale.stores as any)?.accounts?.business_name}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-white">
                        KES {Number(sale.grand_total).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          sale.payment_method === 'cash' ? 'bg-zinc-500/10 text-zinc-500' :
                          sale.payment_method === 'card' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-green-500/10 text-green-500'
                        }`}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#444]">
                        {new Date(sale.sale_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                  {(!recentSales || recentSales.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#444] text-xs underline decoration-dotted">
                        No transactions recorded today
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: System Overview */}
        <div>
          <h2 className="text-white text-sm font-semibold tracking-tight mb-4">System Overview</h2>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-3">
            <div className="divide-y divide-[#1f1f1f]">
              {quickStatsItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center justify-between py-3 px-3 hover:bg-white/[0.02] rounded-sm transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-3.5 h-3.5 ${item.alert ? "text-amber-400" : "text-[#444]"}`} />
                      <span className="text-[#666] text-xs underline decoration-white/5">{item.label}</span>
                    </div>
                    <span className={`text-xs font-bold ${item.alert ? "text-amber-400" : "text-white"}`}>
                      {item.value}
                    </span>
                  </div>
                )
              })}
            </div>
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
