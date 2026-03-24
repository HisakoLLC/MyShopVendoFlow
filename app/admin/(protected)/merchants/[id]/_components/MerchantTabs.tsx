"use client"

import { useState } from "react"
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
  Lock
} from "lucide-react"
import PermissionGate from "../../../_components/PermissionGate"

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
  whatsapp: any[]
  reports: any[]
  merchantId: string
}

export default function MerchantTabs({ 
  sales, 
  inventory, 
  purchaseOrders, 
  whatsapp, 
  reports,
  merchantId
}: MerchantTabsProps) {
  const [activeTab, setActiveTab] = useState<"sales" | "inventory" | "pos" | "whatsapp" | "reports">("sales")

  const tabs = [
    { id: "sales", label: "Sales Overview", icon: TrendingUp },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "pos", label: "Purchase Orders", icon: ShoppingCart },
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
    { id: "reports", label: "Reports", icon: FileBarChart },
  ] as const

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex gap-8 border-b border-[#1f1f1f] overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
              activeTab === tab.id ? "text-white" : "text-[#444] hover:text-[#666]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
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
                <div key={m.label} className="bg-[#111] border border-[#1f1f1f] rounded-lg p-5">
                  <div className="text-[#444] text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                    {m.label}
                    {m.permission && <Lock className="w-2 h-2 opacity-20" />}
                  </div>
                  {m.permission ? (
                    <PermissionGate permission={m.permission as any} fallback={<div className="text-sm font-black text-[#222]">RESTRICTED</div>}>
                      <div className="text-xl font-bold text-white tracking-tight">
                        {m.isPrice ? `KES ${Number(m.value).toLocaleString()}` : m.value}
                      </div>
                    </PermissionGate>
                  ) : (
                    <div className="text-xl font-bold text-white tracking-tight">
                      {m.isPrice ? `KES ${Number(m.value).toLocaleString()}` : m.value}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sales Table */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1f1f1f] bg-[#161616] flex justify-between items-center">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest">Recent Sales</h3>
                <span className="text-[#444] text-[10px] uppercase font-mono italic">Showing last 20</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] bg-[#1a1a1a]">
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Receipt</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Store</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Total</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Method</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {sales.history.map((sale) => (
                      <tr key={sale.receipt_number} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-white/50">{sale.receipt_number}</td>
                        <td className="px-6 py-4 text-xs text-white">{sale.stores?.name}</td>
                        <td className="px-6 py-4 text-xs font-mono text-white">
                          <PermissionGate permission="merchants_financial" fallback={<span className="text-[#222]">——</span>}>
                            KES {Number(sale.grand_total).toLocaleString()}
                          </PermissionGate>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-white/5 text-[#666] border border-white/5">{sale.payment_method}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#444]">{new Date(sale.sale_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {sales.history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[#444] text-xs">No sales recorded yet.</td>
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
                <div key={m.label} className="bg-[#111] border border-[#1f1f1f] rounded-lg p-5">
                  <div className="text-[#444] text-[10px] font-bold uppercase tracking-widest mb-2">{m.label}</div>
                  <div className={`text-xl font-bold tracking-tight ${m.alert ? "text-amber-400" : "text-white"}`}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Inventory Table */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1f1f1f] bg-[#161616]">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest">Product Catalog</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] bg-[#1a1a1a]">
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Style Name</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Category</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444] text-center">Variants</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444] text-center">Stock</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444] text-right">Base Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {inventory.styles.map((style) => (
                      <tr key={style.style_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-white">{style.name}</td>
                        <td className="px-6 py-4 text-xs text-[#666] italic underline decoration-[#1f1f1f]">{style.categories?.name || "Uncategorized"}</td>
                        <td className="px-6 py-4 text-xs text-center text-white/50">{style.product_variants?.[0]?.count || 0}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs text-white font-mono">{style.inventory_total || 0}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-mono text-white/70">KES {Number(style.base_price).toLocaleString()}</td>
                      </tr>
                    ))}
                    {inventory.styles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[#444] text-xs underline decoration-dotted">No products in catalog.</td>
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
             <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1f1f1f] bg-[#161616] flex justify-between items-center">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest">Purchase Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] bg-[#1a1a1a]">
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">PO Number</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Supplier</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Status</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444] text-right">Total Cost</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Order Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {purchaseOrders.map((po) => (
                      <tr key={po.po_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-white">#{po.po_number}</td>
                        <td className="px-6 py-4 text-xs text-white/70">{po.suppliers?.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            po.status === 'received' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            po.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-mono text-white">KES {Number(po.total_cost).toLocaleString()}</td>
                        <td className="px-6 py-4 text-xs text-[#444]">{new Date(po.order_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {purchaseOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[#444] text-xs italic">No purchase orders found.</td>
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
              <h3 className="text-white text-sm font-semibold tracking-tight">Active Conversations</h3>
              <Link 
                href={`/admin/whatsapp?merchant=${merchantId}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#22c55e] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#1eb054] transition-colors"
              >
                <Plus className="w-3 h-3" />
                Start Conversation
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {whatsapp.map((conv) => (
                <div key={conv.id} className="bg-[#111] border border-[#1f1f1f] rounded-lg p-5 flex justify-between items-start hover:border-[#333] transition-colors group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{conv.contact_name || "Unknown Contact"}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                        conv.status === 'open' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {conv.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#444] font-mono">{conv.contact_phone}</div>
                    <div className="text-[10px] text-[#666] pt-2 flex items-center gap-1.5">
                      <MessageSquare className="w-2.5 h-2.5" />
                      {conv.unread_count > 0 ? `${conv.unread_count} unread` : "No new messages"}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-[10px] text-[#444] uppercase font-bold tracking-tighter italic">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : "No messages"}
                    </div>
                    <Link 
                      href={`/admin/whatsapp/${conv.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#22c55e] hover:underline"
                    >
                      Chat
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
              {whatsapp.length === 0 && (
                <div className="col-span-full bg-[#111] border border-[#1f1f1f] border-dashed rounded-lg py-12 flex flex-col items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[#444]" />
                  </div>
                   <p className="text-[#444] text-xs">No conversations with this merchant yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white text-sm font-semibold tracking-tight">Performance Reports</h3>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#1f1f1f] text-[#666] text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-white/20 transition-all">
                <Plus className="w-3 h-3" />
                Generate Report
              </button>
            </div>

            <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] bg-[#1a1a1a]">
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Type</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Period</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444]">Status</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444] text-right">Sent Date</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#444] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-white uppercase tracking-tighter">{report.report_type} Report</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-white/50 italic">
                          {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              report.status === 'sent' ? 'bg-[#22c55e]' : 'bg-amber-500'
                            }`} />
                            <span className="text-xs text-white font-medium capitalize">{report.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-[#444]">
                          {report.sent_at ? new Date(report.sent_at).toLocaleDateString() : "--"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="text-[#444] hover:text-white transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[#444] text-xs">No reports generated for this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
