"use client"

import { useState } from "react"
import { X, Loader2, DollarSign, Calendar, FileText, ChevronRight, Check } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface RecordPaymentModalProps {
  onClose: () => void
  onSuccess: () => void
  merchants: { id: string, name: string }[]
}

export default function RecordPaymentModal({ onClose, onSuccess, merchants }: RecordPaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: "",
    type: "subscription",
    merchantId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const toastId = adminToast.loading("Recording transaction...")
    try {
      const res = await fetch("/api/admin/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      })
      if (!res.ok) throw new Error("Failed to save")
      adminToast.success("Financial ledger updated")
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      adminToast.error("Transaction entry failed")
    } finally {
      adminToast.dismiss(toastId)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#1f1f1f]">
          <h2 className="text-white font-bold tracking-tight">Record Financial Entry</h2>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Amount (KES)</label>
            <div className="relative">
               <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#22c55e]" />
               <input 
                type="number" 
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-white/5 border border-[#1f1f1f] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all"
               />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Entry Type</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-white/5 border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] appearance-none"
              >
                <option value="subscription">Subscription</option>
                <option value="consulting">Consulting</option>
                <option value="other">Revenue (Other)</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                <input 
                  type="date" 
                  value={formData.transactionDate}
                  onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                  className="w-full bg-white/5 border border-[#1f1f1f] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Link Merchant (Optional)</label>
            <select 
              value={formData.merchantId}
              onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
              className="w-full bg-white/5 border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] appearance-none"
            >
              <option value="">No Merchant Linked</option>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Notes</label>
            <textarea 
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal record details..."
              className="w-full bg-white/5 border border-[#1f1f1f] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#22c55e] resize-none"
            />
          </div>

          <div className="pt-4">
             <button 
              type="submit" 
              disabled={isSubmitting || !formData.amount}
              className="w-full py-4 bg-[#22c55e] text-black rounded-xl text-[11px] font-black uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-[#22c55e]/10 transition-all flex items-center justify-center gap-2"
             >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Post Entry</>}
             </button>
          </div>
        </form>
      </div>
    </div>
  )
}
