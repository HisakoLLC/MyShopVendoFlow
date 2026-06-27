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
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        const start = new Date(d.setDate(diff))
        const end = new Date(d.setDate(diff + 6))
        periodStart = start.toISOString().split('T')[0]
        periodEnd = end.toISOString().split('T')[0]
      } else if (reportType === "monthly") {
        const d = new Date(date)
        const start = new Date(d.getFullYear(), d.getMonth(), 1)
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 font-sans">
      <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#E8400C]" />
            <h2 className="text-foreground font-bold tracking-tight">Generate Report</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Searchable Merchant Selector */}
          <div className="space-y-2" ref={dropdownRef}>
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Select Merchant</label>
            
            <div className="relative">
              {isLoadingMerchants ? (
                <div className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-[#E8400C]" />
                  Loading merchants...
                </div>
              ) : merchantsError ? (
                <button 
                  onClick={fetchMerchants}
                  className="w-full bg-destructive/10 border border-destructive/20 rounded-md px-4 py-2.5 text-xs text-destructive flex items-center justify-between hover:bg-destructive/20 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-3 h-3" />
                    Failed to load merchants
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider underline">Retry</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    type="button"
                    className={`w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm text-left flex items-center justify-between hover:border-foreground/40 transition-colors cursor-pointer ${selectedMerchant ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                  >
                    <span className="truncate">
                      {selectedMerchant ? selectedMerchant.name : "Select a merchant..."}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-md shadow-2xl z-[10] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-border flex items-center gap-2 bg-muted/30">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search merchants..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs text-foreground placeholder-muted-foreground w-full py-1 font-medium"
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
                              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                                merchantId === m.id ? "bg-[#E8400C]/10 text-[#E8400C] font-bold" : "text-foreground hover:bg-accent hover:text-foreground font-medium"
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              {merchantId === m.id && <Check className="w-3 h-3" />}
                            </button>
                          ))
                        ) : (
                          <div className="py-8 text-center space-y-2">
                             <Search className="w-6 h-6 text-muted-foreground/30 mx-auto" />
                             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">No merchants found</p>
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
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Report Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["daily", "weekly", "monthly"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`py-2 rounded-md border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    reportType === type 
                      ? "bg-[#E8400C]/10 border-[#E8400C] text-[#E8400C]" 
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Period Selector */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {reportType === "daily" ? "Select Date" : reportType === "weekly" ? "Select Week Starting" : "Select Month"}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={reportType === "monthly" ? "month" : "date"}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground/40 transition-colors font-medium"
              />
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              * Report will include all data for the selected {reportType} period.
            </p>
          </div>

          {/* Preview Placeholder */}
          <div className="p-4 rounded-md bg-muted/30 border border-border border-dashed text-center space-y-2">
             <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Extraction Scope</div>
             <p className="text-xs text-muted-foreground">Revenue, store performance, top 5 products, and inventory snapshot will be analyzed.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/40 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!merchantId || isGenerating}
            className="flex-3 py-2.5 rounded-md bg-[#E8400C] text-white font-semibold text-xs uppercase tracking-wider hover:bg-[#c73508] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
