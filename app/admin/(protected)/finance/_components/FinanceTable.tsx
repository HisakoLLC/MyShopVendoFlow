"use client"

import { useState } from "react"
import { Plus, Search, Filter, ArrowRight, CreditCard, User, MoreVertical, Calendar } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  type: string
  transaction_date: string
  accounts?: { business_name: string } | null
  notes: string
}

interface FinanceTableProps {
  initialTransactions: Transaction[]
  onAddTransaction: () => void
}

export default function FinanceTable({ initialTransactions, onAddTransaction }: FinanceTableProps) {
  const [search, setSearch] = useState("")

  const filtered = initialTransactions.filter(t => 
    t.accounts?.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.notes?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
      <div className="p-5 border-b border-[#1f1f1f] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
           <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444] group-focus-within:text-[#22c55e] transition-colors" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-[#1f1f1f] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#22c55e] transition-all"
            />
          </div>
          <button className="p-2 border border-[#1f1f1f] rounded-lg text-[#444] hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={onAddTransaction}
          className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:shadow-xl hover:shadow-[#22c55e]/10 transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#161616] text-[#444] border-b border-[#1f1f1f]">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Merchant</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Notes</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f1f1f]">
            {filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2 text-xs text-[#888] font-mono">
                     <Calendar className="w-3 h-3 text-[#333]" />
                     {formatDate(tx.transaction_date)}
                   </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded bg-[#22c55e]/10 flex items-center justify-center border border-[#22c55e]/20">
                       <User className="w-3 h-3 text-[#22c55e]" />
                     </div>
                     <span className="text-white text-xs font-semibold">{tx.accounts?.business_name || "Misc / General"}</span>
                   </div>
                </td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                     tx.type === 'subscription' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : 
                     tx.type === 'expense' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 
                     'text-purple-400 bg-purple-400/10 border-purple-400/20'
                   }`}>
                     {tx.type}
                   </span>
                </td>
                <td className="px-6 py-4">
                   <div className={`text-xs font-black font-mono ${tx.type === 'expense' ? 'text-red-400' : 'text-[#22c55e]'}`}>
                     {tx.type === 'expense' ? '-' : '+'} KES {tx.amount?.toLocaleString()}
                   </div>
                </td>
                <td className="px-6 py-4">
                   <p className="text-[10px] text-[#555] truncate max-w-[200px]">{tx.notes || '—'}</p>
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="p-1 text-[#333] hover:text-[#888] transition-colors">
                     <MoreVertical className="w-4 h-4" />
                   </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center opacity-30">
                  <p className="text-[#444] text-xs font-bold uppercase tracking-widest">No transactions found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
