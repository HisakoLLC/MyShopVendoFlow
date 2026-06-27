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
    <div className="px-6 py-8 md:px-10 max-w-7xl mx-auto space-y-10 font-sans">
      {/* Page Header */}
      <div>
        <div className="text-muted-foreground/80 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Corporate Intelligence</div>
        <h1 className="text-foreground text-3xl md:text-4xl font-bold tracking-tight leading-none">OVERVIEW</h1>
        <p className="text-muted-foreground text-xs font-semibold mt-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-card border border-border rounded-lg p-6 group hover:border-[#E8400C]/40 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="text-muted-foreground text-[10px] tracking-wider uppercase font-semibold">
                  {stat.label}
                </span>
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-[#E8400C] transition-colors" />
              </div>
              <div className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${stat.trend || "text-foreground"}`}>
                {stat.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Transactions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xs font-bold uppercase tracking-wider">Recent Transactions — Live Feed</h2>
            <button className="text-muted-foreground hover:text-[#E8400C] text-[10px] uppercase tracking-wider font-bold transition-colors cursor-pointer">
              FULL LOG →
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Receipt ID</th>
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Merchant Store</th>
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Protocol</th>
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentSales?.map((sale) => (
                    <tr key={sale.receipt_number} className="hover:bg-accent/50 transition-colors group">
                      <td className="px-5 py-3 text-xs font-semibold text-foreground font-mono group-hover:text-[#E8400C] transition-colors">{sale.receipt_number}</td>
                      <td className="px-5 py-3">
                        <div className="text-xs text-foreground font-semibold">{(sale.stores as any)?.name}</div>
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{(sale.stores as any)?.accounts?.business_name}</div>
                      </td>
                      <td className="px-5 py-3 text-xs font-bold text-foreground text-right font-mono tabular-nums">
                        {Number(sale.grand_total).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border inline-block ${
                          sale.payment_method === 'cash' ? 'bg-muted text-muted-foreground border-border' :
                          sale.payment_method === 'card' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          'bg-[#E8400C]/10 text-[#E8400C] border-[#E8400C]/20'
                        }`}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground font-mono text-right tabular-nums">
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
        <div className="space-y-4">
          <h2 className="text-foreground text-xs font-bold uppercase tracking-wider">System Health — Metrics</h2>
          <div className="bg-card border border-border rounded-lg p-3 space-y-1 shadow-sm">
            {quickStatsItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center justify-between py-2.5 px-3 hover:bg-accent rounded-md transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${item.alert ? (item.alertColor || "text-amber-500") : "text-muted-foreground group-hover:text-foreground"}`} />
                    <span className="text-muted-foreground text-xs font-semibold group-hover:text-foreground transition-colors">{item.label}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono tabular-nums ${item.alert ? (item.alertColor || "text-amber-500") : "text-foreground"}`}>
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
