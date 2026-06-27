"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  FileBarChart,
  ChevronRight,
  ExternalLink,
  Plus,
  AlertCircle,
  Lock,
  CreditCard,
  Activity
} from "lucide-react"
import PermissionGate from "../../../_components/PermissionGate"
import BillingTab from "../../../_components/merchants/BillingTab"
import ActivityTab from "../../../_components/merchants/ActivityTab"

interface MerchantTabsProps {
  sales: {
    metrics: {
      totalRevenue: number
      totalTransactions: number
      avgBasket: number
      lastSaleDate: string | null
    }
    history: any[]
  }
  inventory: {
    metrics: {
      totalStyles: number
      totalVariants: number
      lowStockCount: number
      deadStockCount: number
    }
    styles: any[]
  }
  purchaseOrders: any[]
  whatsapp:        any[]
  reports:         any[]
  merchantId:      string
  initialTab?:     string
}

export default function MerchantTabs({ 
  sales, 
  inventory, 
  purchaseOrders, 
  whatsapp, 
  reports,
  merchantId,
  initialTab = "billing",
}: MerchantTabsProps) {
  const router = useRouter()
  type TabId = "billing" | "sales" | "inventory" | "pos" | "whatsapp" | "reports" | "activity"
  const VALID_TABS: TabId[] = ["billing", "sales", "inventory", "pos", "whatsapp", "reports", "activity"]
  const safeInitial: TabId = VALID_TABS.includes(initialTab as TabId) ? (initialTab as TabId) : "billing"
  const [activeTab, setActiveTab] = useState<TabId>(safeInitial)

  function switchTab(id: TabId) {
    setActiveTab(id)
    router.push(`?tab=${id}`, { scroll: false })
  }

  const tabs = [
    { id: "billing",   label: "Billing",         icon: CreditCard },
    { id: "sales",     label: "Sales Overview",  icon: TrendingUp },
    { id: "inventory", label: "Inventory",        icon: Package },
    { id: "pos",       label: "Purchase Orders",  icon: ShoppingCart },
    { id: "whatsapp",  label: "WhatsApp",         icon: MessageSquare },
    { id: "reports",   label: "Reports",          icon: FileBarChart },
    { id: "activity",  label: "Activity",         icon: Activity },
  ] as const

  return (
    <div className="space-y-6 font-sans">
      {/* Tabs Header */}
      <div className="flex gap-8 border-b border-border overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-wider transition-all relative whitespace-nowrap cursor-pointer ${
              activeTab === tab.id ? "text-[#E8400C]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8400C]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "billing" && (
          <BillingTab accountId={merchantId} />
        )}

        {activeTab === "sales" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Sales Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: "Total Revenue", 
                  value: sales.metrics.totalRevenue,
                  isPrice: true,
                  permission: "merchants_financial"
                },
                { 
                  label: "Transactions", 
                  value: sales.metrics.totalTransactions 
                },
                { 
                  label: "Avg Basket", 
                  value: sales.metrics.avgBasket,
                  isPrice: true,
                  permission: "merchants_financial"
                },
                { 
                  label: "Last Sale", 
                  value: sales.metrics.lastSaleDate ? new Date(sales.metrics.lastSaleDate).toLocaleDateString() : "Never" 
                },
              ].map((m) => (
                <div key={m.label} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                  <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                    {m.label}
                    {m.permission && <Lock className="w-3 h-3 opacity-40" />}
                  </div>
                  {m.permission ? (
                    <PermissionGate permission={m.permission as any} fallback={<div className="text-xs font-bold text-muted-foreground">RESTRICTED</div>}>
                      <div className="text-xl font-bold text-foreground tracking-tight font-mono tabular-nums">
                        {m.isPrice ? `KES ${Number(m.value).toLocaleString()}` : m.value}
                      </div>
                    </PermissionGate>
                  ) : (
                    <div className="text-xl font-bold text-foreground tracking-tight font-mono tabular-nums">
                      {m.isPrice ? `KES ${Number(m.value).toLocaleString()}` : m.value}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sales Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/40 flex justify-between items-center">
                <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">Recent Sales</h3>
                <span className="text-muted-foreground text-[10px] uppercase font-mono italic">Showing last 20</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Receipt</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Store</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Method</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sales.history.map((sale) => (
                      <tr key={sale.receipt_number} className="hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-3.5 text-xs font-mono text-muted-foreground">{sale.receipt_number}</td>
                        <td className="px-6 py-3.5 text-xs font-semibold text-foreground">{sale.stores?.name}</td>
                        <td className="px-6 py-3.5 text-xs font-mono font-bold text-foreground tabular-nums">
                          <PermissionGate permission="merchants_financial" fallback={<span className="text-muted-foreground">——</span>}>
                            KES {Number(sale.grand_total).toLocaleString()}
                          </PermissionGate>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-muted text-muted-foreground border border-border">{sale.payment_method}</span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-muted-foreground">{new Date(sale.sale_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {sales.history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs">No sales recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Inventory Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Styles", value: inventory.metrics.totalStyles },
                { label: "Total Variants", value: inventory.metrics.totalVariants },
                { label: "Low Stock", value: inventory.metrics.lowStockCount, alert: inventory.metrics.lowStockCount > 0 },
                { label: "Dead Stock", value: inventory.metrics.deadStockCount, alert: inventory.metrics.deadStockCount > 0 },
              ].map((m) => (
                <div key={m.label} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                  <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-2">{m.label}</div>
                  <div className={`text-xl font-bold tracking-tight font-mono tabular-nums ${m.alert ? "text-amber-500" : "text-foreground"}`}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Inventory Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/40">
                <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">Product Catalog</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Style Name</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Variants</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Stock</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Base Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inventory.styles.map((style) => (
                      <tr key={style.style_id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-3.5 text-xs font-semibold text-foreground">{style.name}</td>
                        <td className="px-6 py-3.5 text-xs text-muted-foreground">{style.categories?.name || "Uncategorized"}</td>
                        <td className="px-6 py-3.5 text-xs text-center font-mono text-muted-foreground">{style.product_variants?.[0]?.count || 0}</td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-xs text-foreground font-mono font-bold tabular-nums">{style.inventory_total || 0}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-xs font-mono font-bold text-foreground tabular-nums">KES {Number(style.base_price).toLocaleString()}</td>
                      </tr>
                    ))}
                    {inventory.styles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs">No products in catalog.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pos" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/40 flex justify-between items-center">
                <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">Purchase Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PO Number</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Total Cost</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Order Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchaseOrders.map((po) => (
                      <tr key={po.po_id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-3.5 text-xs font-mono font-bold text-foreground">#{po.po_number}</td>
                        <td className="px-6 py-3.5 text-xs font-semibold text-foreground">{po.suppliers?.name}</td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            po.status === 'received' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            po.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                            'bg-muted text-muted-foreground border-border'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-xs font-mono font-bold text-foreground tabular-nums">KES {Number(po.total_cost).toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-xs text-muted-foreground">{new Date(po.order_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {purchaseOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs italic">No purchase orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "whatsapp" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-foreground text-sm font-semibold tracking-tight">Active Conversations</h3>
              <Link 
                href={`/admin/whatsapp?merchant=${merchantId}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#E8400C] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#c73508] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Start Conversation
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {whatsapp.map((conv) => (
                <div key={conv.id} className="bg-card border border-border rounded-lg p-5 flex justify-between items-start hover:border-foreground/40 transition-colors group shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{conv.contact_name || "Unknown Contact"}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        conv.status === 'open' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {conv.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{conv.contact_phone}</div>
                    <div className="text-[11px] text-muted-foreground pt-2 flex items-center gap-1.5 font-medium">
                      <MessageSquare className="w-3 h-3 text-[#E8400C]" />
                      {conv.unread_count > 0 ? `${conv.unread_count} unread` : "No new messages"}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider font-mono">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : "No messages"}
                    </div>
                    <Link 
                      href={`/admin/whatsapp/${conv.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#E8400C] hover:underline"
                    >
                      Chat
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
              {whatsapp.length === 0 && (
                <div className="col-span-full bg-card border border-border border-dashed rounded-lg py-12 flex flex-col items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </div>
                   <p className="text-muted-foreground text-xs font-medium">No conversations with this merchant yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-foreground text-sm font-semibold tracking-tight">Performance Reports</h3>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-card text-muted-foreground text-xs font-semibold uppercase tracking-wider hover:text-foreground hover:border-foreground/40 transition-all shadow-sm cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                Generate Report
              </button>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Period</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Sent Date</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className="text-xs font-bold text-foreground uppercase tracking-tight">{report.report_type} Report</span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-muted-foreground font-medium">
                          {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              report.status === 'sent' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`} />
                            <span className="text-xs text-foreground font-semibold capitalize">{report.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right text-xs text-muted-foreground font-mono">
                          {report.sent_at ? new Date(report.sent_at).toLocaleDateString() : "--"}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs">No reports generated for this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === "activity" && (
          <ActivityTab accountId={merchantId} />
        )}
      </div>
    </div>
  )
}
