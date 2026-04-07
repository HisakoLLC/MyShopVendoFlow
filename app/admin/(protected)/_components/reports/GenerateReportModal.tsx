import { useState, useEffect, useMemo, useRef } from "react"
import { X, Calendar, BarChart3, Loader2, Check, Search, AlertCircle, ChevronDown } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface Merchant {
  id: string
  name: string
}

interface GenerateReportModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function GenerateReportModal({ onClose, onSuccess }: GenerateReportModalProps) {
  const [merchantId, setMerchantId] = useState("")
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isGenerating, setIsGenerating] = useState(false)
  
  // New States for Searchable Merchant Selection
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
    merchants.find(m => m.id === merchantId),
    [merchants, merchantId]
  )

  const handleGenerate = async () => {
    if (!merchantId) return
    setIsGenerating(true)
    const toastId = adminToast.loading("Mining Sales Data...")

    try {
      // Calculate period range
      let periodStart = date
      let periodEnd = date

      if (reportType === "weekly") {
        const d = new Date(date + "T00:00:00Z")
        const day = d.getUTCDay()
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff))
        const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff + 6))
        periodStart = start.toISOString().split('T')[0]
        periodEnd = end.toISOString().split('T')[0]
      } else if (reportType === "monthly") {
        const [year, month] = date.split('-').map(Number)
        const start = new Date(Date.UTC(year, month - 1, 1))
        const end = new Date(Date.UTC(year, month, 0))
        periodStart = start.toISOString().split('T')[0]
        periodEnd = end.toISOString().split('T')[0]
      }

      const res = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, reportType, periodStart, periodEnd })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || errData.detail || "Failed to generate report")
      }

      adminToast.success("Performance report generated")
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      adminToast.error(`Data mining failed: ${error.message}`)
    } finally {
      adminToast.dismiss(toastId)
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#22c55e]" />
            <h2 className="text-white font-bold tracking-tight">Generate Report</h2>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Searchable Merchant Selector */}
          <div className="space-y-2" ref={dropdownRef}>
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">Select Merchant</label>
            
            <div className="relative">
              {isLoadingMerchants ? (
                <div className="w-full bg-white/5 border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-xs text-[#444] flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading merchants...
                </div>
              ) : merchantsError ? (
                <button 
                  onClick={fetchMerchants}
                  className="w-full bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2.5 text-xs text-red-500 flex items-center justify-between hover:bg-red-500/10 transition-colors"
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
                    className={`w-full bg-white/5 border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm text-left flex items-center justify-between hover:border-[#333] transition-colors ${selectedMerchant ? "text-white" : "text-[#444]"}`}
                  >
                    <span className="truncate">
                      {selectedMerchant ? selectedMerchant.name : "Select a merchant..."}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#444] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-[#1f1f1f] rounded-xl shadow-2xl z-[10] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                        {filteredMerchants.length > 0 ? (
                          filteredMerchants.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setMerchantId(m.id)
                                setIsDropdownOpen(false)
                                setSearchQuery("")
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between group ${
                                merchantId === m.id ? "bg-[#22c55e]/10 text-[#22c55e]" : "text-[#888] hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              {merchantId === m.id && <Check className="w-3 h-3" />}
                            </button>
                          ))
                        ) : (
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

          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">Report Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["daily", "weekly", "monthly"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                    reportType === type 
                      ? "bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e]" 
                      : "bg-white/5 border-[#1f1f1f] text-[#444] hover:text-[#666]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Period Selector */}
          <div className="space-y-2">
            <label className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">
              {reportType === "daily" ? "Select Date" : reportType === "weekly" ? "Select Week Starting" : "Select Month"}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type={reportType === "monthly" ? "month" : "date"}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <p className="text-[9px] text-[#444] italic">
              * Report will include all data for the selected {reportType} period.
            </p>
          </div>

          {/* Preview Placeholder */}
          <div className="p-4 rounded-lg bg-[#111] border border-[#1f1f1f] border-dashed text-center space-y-2">
             <div className="text-[9px] text-[#444] font-black uppercase tracking-[0.2em]">Extraction Scope</div>
             <p className="text-[10px] text-[#666]">Revenue, store performance, top 5 products, and inventory snapshot will be analyzed.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1f1f1f] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#1f1f1f] text-[11px] font-black uppercase tracking-widest text-[#444] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!merchantId || isGenerating}
            className="flex-3 py-2.5 rounded-lg bg-[#22c55e] text-black font-black text-[11px] uppercase tracking-widest hover:shadow-xl hover:shadow-[#22c55e]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Report
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
