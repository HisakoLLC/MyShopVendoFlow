import { useState, useEffect, useMemo, useRef } from "react"
import { X, Loader2, DollarSign, Calendar, Check, Search, ChevronDown, AlertCircle } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface Merchant {
  id: string
  name: string
}

interface RecordPaymentModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function RecordPaymentModal({ onClose, onSuccess }: RecordPaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: "",
    type: "subscription",
    merchantId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // New States for Searchable Merchant Selection
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true)
  const [merchantsError, setMerchantsError] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMerchants()
    
    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchMerchants = async () => {
    setIsLoadingMerchants(true)
    setMerchantsError(false)
    try {
      const res = await fetch("/api/admin/merchants")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setMerchants(data || [])
    } catch (err) {
      console.error(err)
      setMerchantsError(true)
    } finally {
      setIsLoadingMerchants(false)
    }
  }

  const filteredMerchants = useMemo(() => {
    if (!searchQuery) return merchants
    return merchants.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [merchants, searchQuery])

  const selectedMerchant = useMemo(() => 
    merchants.find(m => m.id === formData.merchantId),
    [merchants, formData.merchantId]
  )

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

          <div className="space-y-2" ref={dropdownRef}>
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Link Merchant (Optional)</label>
            <div className="relative">
              {isLoadingMerchants ? (
                <div className="w-full bg-white/5 border border-[#1f1f1f] rounded-xl px-4 py-3 text-xs text-[#444] flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading merchants...
                </div>
              ) : merchantsError ? (
                <button 
                  onClick={fetchMerchants}
                  type="button"
                  className="w-full bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-500 flex items-center justify-between hover:bg-red-500/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    Failed to load merchants
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest underline">Retry</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    type="button"
                    className={`w-full bg-white/5 border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between hover:border-[#333] transition-colors ${selectedMerchant ? "text-white" : "text-[#444]"}`}
                  >
                    <span className="truncate">
                      {selectedMerchant ? selectedMerchant.name : "No Merchant Linked"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#444] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-[#1f1f1f] rounded-2xl shadow-2xl z-[10] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-[#1f1f1f] flex items-center gap-2 bg-white/[0.02]">
                        <Search className="w-4 h-4 text-[#444]" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search merchants..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs text-white placeholder-[#444] w-full py-1"
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                        <button
                          key="none"
                          onClick={() => {
                            setFormData({ ...formData, merchantId: "" })
                            setIsDropdownOpen(false)
                            setSearchQuery("")
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between group ${
                            !formData.merchantId ? "bg-white/10 text-white" : "text-[#444] hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="truncate italic">No Merchant Linked</span>
                          {!formData.merchantId && <Check className="w-3 h-3" />}
                        </button>
                        
                        {filteredMerchants.length > 0 ? (
                          filteredMerchants.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setFormData({ ...formData, merchantId: m.id })
                                setIsDropdownOpen(false)
                                setSearchQuery("")
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between group ${
                                formData.merchantId === m.id ? "bg-[#22c55e]/10 text-[#22c55e]" : "text-[#888] hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              {formData.merchantId === m.id && <Check className="w-3 h-3" />}
                            </button>
                          ))
                        ) : searchQuery && (
                          <div className="py-8 text-center space-y-2">
                             <Search className="w-6 h-6 text-[#1f1f1f] mx-auto" />
                             <p className="text-[10px] text-[#444] uppercase font-bold tracking-widest">No merchants found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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
