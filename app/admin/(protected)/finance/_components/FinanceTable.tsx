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
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
           <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-input rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <button className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={onAddTransaction}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b border-border">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Merchant</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Notes</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-accent/50 transition-colors group">
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                     <Calendar className="w-3 h-3 text-muted-foreground/50" />
                     {formatDate(tx.transaction_date)}
                   </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center border border-emerald-200">
                       <User className="w-3 h-3 text-emerald-600" />
                     </div>
                     <span className="text-foreground text-xs font-semibold">{tx.accounts?.business_name || "Misc / General"}</span>
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
                   <div className={`text-xs font-black font-mono ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-600'}`}>
                     {tx.type === 'expense' ? '-' : '+'} KES {tx.amount?.toLocaleString()}
                   </div>
                </td>
                <td className="px-6 py-4">
                   <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{tx.notes || '—'}</p>
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                     <MoreVertical className="w-4 h-4" />
                   </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center opacity-50">
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">No transactions found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
