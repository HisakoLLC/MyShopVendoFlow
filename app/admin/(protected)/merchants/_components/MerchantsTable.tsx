"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronRight, Store, Package, TrendingUp, Calendar, Lock } from "lucide-react"
import PermissionGate from "../../_components/PermissionGate"

export type MerchantListItem = {
  account_id: string
  business_name: string
  owner_email: string
  store_count: number
  product_count: number
  total_sales: number
  created_at: string
}

interface MerchantsTableProps {
  merchants: MerchantListItem[]
}

export default function MerchantsTable({ merchants }: MerchantsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      const searchLower = search.toLowerCase()
      return (
        m.business_name?.toLowerCase().includes(searchLower) ||
        m.owner_email?.toLowerCase().includes(searchLower)
      )
    })
  }, [merchants, search])

  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Search by business name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-[#1f1f1f] rounded-md pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
          />
        </div>
        
        {/* Total Count Badge */}
        <div className="bg-[#111] border border-[#1f1f1f] px-4 py-2 rounded-md whitespace-nowrap">
          <span className="text-[#444] text-[10px] font-bold uppercase tracking-widest mr-2">Displaying</span>
          <span className="text-white text-sm font-bold">{filteredMerchants.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#161616]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444]">Account Name</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444]">Owner</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444] text-center">Stores</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444] text-center">Products</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444] text-right">Total Sales</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444]">Joined</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {filteredMerchants.map((merchant) => (
                <tr 
                  key={merchant.account_id}
                  onClick={() => router.push(`/admin/merchants/${merchant.account_id}`)}
                  className="hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-5">
                    <div className="text-sm text-white font-medium group-hover:text-[#22c55e] transition-colors">
                      {merchant.business_name}
                    </div>
                    <div className="text-[10px] text-[#444] font-mono mt-1">{merchant.account_id}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs text-white/70">{merchant.owner_email || "No owner email"}</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                      <Store className="w-3 h-3 text-[#444]" />
                      <span className="text-xs text-white font-semibold">{merchant.store_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                      <Package className="w-3 h-3 text-[#444]" />
                      <span className="text-xs text-white font-semibold">{merchant.product_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-mono">
                    <PermissionGate permission="merchants_financial" fallback={<span className="text-[#333]">——</span>}>
                      <div className="text-xs text-white">KES {merchant.total_sales.toLocaleString()}</div>
                    </PermissionGate>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <Calendar className="w-3 h-3" />
                      {formatDate(merchant.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button className="p-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[#444] hover:text-white border border-[#1f1f1f] rounded hover:bg-white/5 transition-all">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMerchants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#161616] flex items-center justify-center border border-[#1f1f1f]">
                        <Search className="w-5 h-5 text-[#444]" />
                      </div>
                      <p className="text-[#444] text-sm">No merchants found for "{search}"</p>
                      <button 
                        onClick={() => setSearch("")}
                        className="text-xs text-[#22c55e] hover:underline"
                      >
                        Clear search
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
