"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  PlusCircle, 
  Search, 
  Filter, 
  Calendar, 
  BarChart3, 
  ChevronRight, 
  FileText, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Download,
  ExternalLink,
  MessageSquare,
  Clock,
  User,
  ArrowRight
} from "lucide-react"

import GenerateReportModal from "../../_components/reports/GenerateReportModal"
import ReportReviewSheet from "../../_components/reports/ReportReviewSheet"
import SendReportModal from "../../_components/reports/SendReportModal"
import PermissionGate from "../../_components/PermissionGate"

type ReportType = "daily" | "weekly" | "monthly"
type ReportStatus = "draft" | "approved" | "sent" | "rejected"

interface Report {
  id: string
  report_type: ReportType
  period_start: string
  period_end: string
  status: ReportStatus
  created_at: string
  sent_at: string | null
  merchant_id: string
  data?: any
  accounts?: {
    business_name: string
  }
  approver?: {
    full_name: string
  }
  rejection_note?: string | null
}

interface ReportsClientProps {
  initialReports: Report[]
  merchants: { account_id: string, business_name: string }[]
}

export default function ReportsClient({ initialReports, merchants }: ReportsClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"all" | ReportType>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all")
  const [merchantFilter, setMerchantFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showReviewSheet, setShowReviewSheet] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)

  const filteredReports = useMemo(() => {
    return initialReports.filter((report) => {
      const matchesTab = activeTab === "all" || report.report_type === activeTab
      const matchesStatus = statusFilter === "all" || report.status === statusFilter
      const matchesMerchant = merchantFilter === "all" || report.merchant_id === merchantFilter
      const matchesSearch = report.accounts?.business_name?.toLowerCase().includes(search.toLowerCase())
      
      return matchesTab && matchesStatus && matchesMerchant && matchesSearch
    })
  }, [initialReports, activeTab, statusFilter, merchantFilter, search])

  const typeConfig: Record<ReportType, { label: string, color: string }> = {
    daily: { label: "Daily", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    weekly: { label: "Weekly", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
    monthly: { label: "Monthly", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" }
  }

  const statusConfig: Record<ReportStatus, { label: string, color: string }> = {
    draft: { label: "Draft", color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20" },
    approved: { label: "Approved", color: "text-green-400 bg-green-400/10 border-green-400/20" },
    sent: { label: "Sent", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    rejected: { label: "Rejected", color: "text-red-400 bg-red-400/10 border-red-400/20" }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[#444] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Analytics Hub</div>
          <h1 className="text-white text-3xl font-bold tracking-tighter">Merchant Reports</h1>
        </div>
        <PermissionGate permission="reports_generate">
          <button 
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-2xl hover:shadow-[#22c55e]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Generate Report
          </button>
        </PermissionGate>
      </div>

      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 space-y-5">
        <div className="flex gap-4 border-b border-[#1f1f1f]">
          {(["all", "daily", "weekly", "monthly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab ? "text-white" : "text-[#444] hover:text-[#666]"
              }`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-[#1f1f1f] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#22c55e]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white/5 border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#22c55e] appearance-none"
          >
            <option value="all">Status: All</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="sent">Sent</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={merchantFilter}
            onChange={(e) => setMerchantFilter(e.target.value)}
            className="bg-white/5 border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#22c55e] appearance-none"
          >
            <option value="all">All Merchants</option>
            {merchants.map(m => (
              <option key={m.account_id} value={m.account_id}>{m.business_name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input type="date" className="flex-1 bg-white/5 border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-[#444] focus:text-white focus:outline-none" />
            <input type="date" className="flex-1 bg-white/5 border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-[#444] focus:text-white focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#161616]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444]">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444]">Merchant</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444]">Reporting Period</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444]">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444]">Approver</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#444] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {filteredReports.map((report) => (
                <tr 
                  key={report.id} 
                  onClick={() => {
                    setSelectedReport(report)
                    if (report.status === "draft") {
                      setShowReviewSheet(true)
                    } else if (report.status === "approved") {
                      setShowReviewSheet(false)
                    } else {
                      setShowReviewSheet(false)
                    }
                  }}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-5">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${typeConfig[report.report_type].color}`}>
                      {typeConfig[report.report_type].label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-white text-xs font-semibold group-hover:text-[#22c55e] transition-colors">
                      {report.accounts?.business_name}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-[11px] text-[#888] font-mono">
                      <span>{formatDate(report.period_start)}</span>
                      <ArrowRight className="w-3 h-3 text-[#333]" />
                      <span>{formatDate(report.period_end)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusConfig[report.status].color}`}>
                      {statusConfig[report.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-xs text-[#555]">
                      <User className="w-3 h-3" />
                      {report.approver?.full_name || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      {report.status === "draft" &&                         <PermissionGate permission="reports_approve">
                          <button 
                            onClick={() => {
                              setSelectedReport(report)
                              setShowReviewSheet(true)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 text-white border border-[#1f1f1f] text-[9px] font-black uppercase tracking-wider hover:bg-white/10 transition-all"
                          >
                            Review
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </PermissionGate>
                      }
                      {report.status === "approved" && (
                        <PermissionGate permission="reports_send">
                          <button 
                            onClick={() => {
                              setSelectedReport(report)
                              setShowSendModal(true)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 text-[9px] font-black uppercase tracking-wider hover:bg-[#22c55e]/20 transition-all"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Send WhatsApp
                          </button>
                        </PermissionGate>
                      )}
                      {(report.status === "sent" || report.status === "rejected") && (
                        <button 
                          onClick={() => setSelectedReport(report)}
                          className="text-[#444] hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center opacity-30">
                    <p className="text-[#444] text-xs font-bold uppercase tracking-widest">No reports match your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showGenerateModal && (
        <GenerateReportModal 
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {showReviewSheet && selectedReport && (
        <ReportReviewSheet 
          report={selectedReport}
          onClose={() => setShowReviewSheet(false)}
          onAction={() => router.refresh()}
        />
      )}

      {showSendModal && selectedReport && (
        <SendReportModal 
          report={selectedReport}
          onClose={() => setShowSendModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {selectedReport && !showReviewSheet && !showSendModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
            onClick={() => setSelectedReport(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#0d0d0d] border-l border-[#1f1f1f] z-[101] p-8 shadow-2xl animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-start mb-8">
              <div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border mb-2 inline-block ${typeConfig[selectedReport.report_type].color}`}>
                  {typeConfig[selectedReport.report_type].label}
                </span>
                <h2 className="text-white text-2xl font-bold tracking-tight">{selectedReport.accounts?.business_name}</h2>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 text-[#444] hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Status</div>
                  <div className={`text-xs font-bold uppercase ${statusConfig[selectedReport.status].color.split(' ')[0]}`}>
                    {selectedReport.status}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Created</div>
                  <div className="text-xs text-white">{formatDate(selectedReport.created_at)}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#111] border border-[#1f1f1f] space-y-3">
                <div className="text-[9px] text-[#444] uppercase font-bold tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Reporting Period
                </div>
                <div className="flex items-center gap-4 text-sm text-white font-medium">
                  <span>{formatDate(selectedReport.period_start)}</span>
                  <ArrowRight className="w-4 h-4 text-[#22c55e]" />
                  <span>{formatDate(selectedReport.period_end)}</span>
                </div>
              </div>

              {selectedReport.status === "rejected" && (
                <div className="p-4 rounded-lg bg-red-400/5 border border-red-400/10 space-y-2">
                   <div className="text-[9px] text-red-400 uppercase font-black tracking-widest">Rejection Reason</div>
                   <p className="text-xs text-[#888] italic">"{selectedReport.rejection_note || 'No reason provided.'}"</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
