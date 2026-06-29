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
    daily: { label: "Daily", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    weekly: { label: "Weekly", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
    monthly: { label: "Monthly", color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" }
  }

  const statusConfig: Record<ReportStatus, { label: string, color: string }> = {
    draft: { label: "Draft", color: "text-muted-foreground bg-muted border-border" },
    approved: { label: "Approved", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    sent: { label: "Sent", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    rejected: { label: "Rejected", color: "text-destructive bg-destructive/10 border-destructive/20" }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">Analytics Hub</div>
          <h1 className="font-editorial text-foreground text-4xl font-bold tracking-tight uppercase">Merchant Reports</h1>
        </div>
        <PermissionGate permission="reports_generate">
          <button 
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#E8400C] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#c73508] shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generate Report
          </button>
        </PermissionGate>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-5 shadow-sm">
        <div className="flex gap-4 border-b border-border">
          {(["all", "daily", "weekly", "monthly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-xs font-semibold uppercase tracking-wider transition-all relative cursor-pointer ${
                activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8400C]" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-foreground/40 font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-foreground/40 font-medium appearance-none cursor-pointer"
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
            className="bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-foreground/40 font-medium appearance-none cursor-pointer"
          >
            <option value="all">All Merchants</option>
            {merchants.map(m => (
              <option key={m.account_id} value={m.account_id}>{m.business_name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input type="date" className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs text-muted-foreground focus:text-foreground focus:outline-none focus:border-foreground/40 font-medium cursor-pointer" />
            <input type="date" className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs text-muted-foreground focus:text-foreground focus:outline-none focus:border-foreground/40 font-medium cursor-pointer" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Merchant</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reporting Period</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approver</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
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
                  className="hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${typeConfig[report.report_type].color}`}>
                      {typeConfig[report.report_type].label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-foreground text-xs font-semibold group-hover:text-[#E8400C] transition-colors">
                      {report.accounts?.business_name}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{formatDate(report.period_start)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span>{formatDate(report.period_end)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${statusConfig[report.status].color}`}>
                      {statusConfig[report.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <User className="w-3.5 h-3.5" />
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-foreground border border-border text-[10px] font-semibold uppercase tracking-wider hover:bg-accent transition-all cursor-pointer"
                          >
                            Review
                            <ChevronRight className="w-3.5 h-3.5" />
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#E8400C]/10 text-[#E8400C] border border-[#E8400C]/20 text-[10px] font-semibold uppercase tracking-wider hover:bg-[#E8400C]/20 transition-all cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Send WhatsApp
                          </button>
                        </PermissionGate>
                      )}
                      {(report.status === "sent" || report.status === "rejected") && (
                        <button 
                          onClick={() => setSelectedReport(report)}
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                  <td colSpan={6} className="px-6 py-12 text-center opacity-60">
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">No reports match your filters</p>
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
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-[101] p-8 shadow-2xl animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-start mb-8">
              <div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border mb-2 inline-block ${typeConfig[selectedReport.report_type].color}`}>
                  {typeConfig[selectedReport.report_type].label}
                </span>
                <h2 className="text-foreground text-2xl font-bold tracking-tight">{selectedReport.accounts?.business_name}</h2>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status</div>
                  <div className={`text-xs font-bold uppercase ${statusConfig[selectedReport.status].color.split(' ')[0]}`}>
                    {selectedReport.status}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Created</div>
                  <div className="text-xs font-medium text-foreground">{formatDate(selectedReport.created_at)}</div>
                </div>
              </div>

              <div className="p-4 rounded-md bg-muted/40 border border-border space-y-3">
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Reporting Period
                </div>
                <div className="flex items-center gap-4 text-sm text-foreground font-semibold font-mono">
                  <span>{formatDate(selectedReport.period_start)}</span>
                  <ArrowRight className="w-4 h-4 text-[#E8400C]" />
                  <span>{formatDate(selectedReport.period_end)}</span>
                </div>
              </div>

              {selectedReport.status === "rejected" && (
                <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 space-y-2">
                   <div className="text-[10px] text-destructive uppercase font-bold tracking-wider">Rejection Reason</div>
                   <p className="text-xs text-muted-foreground italic">"{selectedReport.rejection_note || 'No reason provided.'}"</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
