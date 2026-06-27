"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CreditCard,
  FileText,
  Plus,
  X,
  Pin,
  Pencil,
  Trash2,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import {
  RecordPaymentModal,
  ChangePlanModal,
  ExtendExpiryModal,
  CreateInvoiceModal,
  SuspendAccountModal,
} from "./billing"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillingData {
  account: {
    plan_tier: string
    subscription_status: string
    dodo_customer_id: string | null
    dodo_subscription_id: string | null
    subscription_current_period_end: string | null
    next_payment_date: string | null
    last_payment_date: string | null
    last_payment_amount: number | null
    subscription_started_at: string | null
  }
  payments: any[]
  invoices: any[]
  flags: any[]
  summary: {
    days_remaining: number | null
    total_paid_kes: number
    total_paid_usd: number
    outstanding_kes: number
    overdue_count: number
  }
  notes: any[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })
}

function fmtAmount(kes?: number | null, usd?: number | null): string {
  if (kes != null && kes > 0) return `KES ${Number(kes).toLocaleString()}`
  if (usd != null && usd > 0) return `USD ${Number(usd).toFixed(2)}`
  return "—"
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Mini badge helpers ───────────────────────────────────────────────────────

const PLAN_STYLES: Record<string, string> = {
  starter: "bg-muted text-muted-foreground border border-border",
  core:    "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  scale:   "bg-purple-500/10 text-purple-500 border border-purple-500/20",
  trial:   "bg-amber-500/10 text-amber-500 border border-amber-500/20",
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  trial:     "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  past_due:  "bg-destructive/10 text-destructive border border-destructive/20",
  suspended: "bg-muted text-muted-foreground border border-border",
  cancelled: "bg-muted text-muted-foreground border border-border",
}

const METHOD_STYLES: Record<string, string> = {
  dodo_card: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  mpesa:     "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  wire:      "bg-muted text-muted-foreground border border-border",
  cash:      "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  waived:    "bg-purple-500/10 text-purple-500 border border-purple-500/20",
}

const INV_STATUS_STYLES: Record<string, string> = {
  unpaid:  "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  paid:    "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  overdue: "bg-destructive/10 text-destructive border border-destructive/20",
  waived:  "bg-muted text-muted-foreground border border-border",
  void:    "bg-muted text-muted-foreground border border-border",
}

const PAY_STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  pending:   "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  failed:    "bg-destructive/10 text-destructive border border-destructive/20",
  refunded:  "bg-muted text-muted-foreground border border-border",
}

function Badge({ cls, label }: { cls: string; label: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  )
}

import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"
import { EmptyState } from "@/app/admin/(protected)/_components/ui/EmptyState"
import { adminToast } from "@/lib/admin/toast"

function BillingSkeleton() {
  return (
    <div className="space-y-4">
      <LoadingSkeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <LoadingSkeleton className="h-64 w-full" />
        <LoadingSkeleton className="h-64 w-full" />
      </div>
      <LoadingSkeleton className="h-40 w-full" />
    </div>
  )
}


// ─── Flag types ───────────────────────────────────────────────────────────────

const FLAG_PRESETS = [
  { value: "vip",           label: "VIP",           color: "amber" },
  { value: "at_risk",       label: "At Risk",       color: "red" },
  { value: "trial_convert", label: "Trial Convert", color: "blue" },
  { value: "support_issue", label: "Support Issue", color: "orange" },
  { value: "custom",        label: "Custom…",       color: "zinc" },
]

const FLAG_COLOR_MAP: Record<string, string> = {
  amber:  "bg-amber-500/10 text-amber-500 border-amber-500/20",
  red:    "bg-destructive/10 text-destructive border-destructive/20",
  blue:   "bg-blue-500/10 text-blue-500 border-blue-500/20",
  orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  zinc:   "bg-muted text-muted-foreground border-border",
}

const inputCls   = "w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors shadow-sm"
const btnPrimary = "px-4 py-2 bg-[#E8400C] text-white text-xs font-semibold rounded-md hover:bg-[#c73508] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
const btnGhost   = "px-4 py-2 bg-transparent border border-border text-muted-foreground text-xs font-semibold rounded-md hover:border-foreground/40 hover:text-foreground transition-all disabled:opacity-50 cursor-pointer"

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BillingTab({ accountId }: { accountId: string }) {
  const adminUser = useAdminUser()
  const isFinance    = ["super_admin", "finance"].includes(adminUser.role)
  const isSuperAdmin = adminUser.role === "super_admin"

  const [data, setData]       = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")

  // Modals
  const [showPayment,  setShowPayment]  = useState(false)
  const [showPlan,     setShowPlan]     = useState(false)
  const [showExpiry,   setShowExpiry]   = useState(false)
  const [showInvoice,  setShowInvoice]  = useState(false)
  const [showSuspend,  setShowSuspend]  = useState(false)

  const [noteText,     setNoteText]     = useState("")
  const [savingNote,   setSavingNote]   = useState(false)
  const [editingNote,  setEditingNote]  = useState<{ id: string; content: string } | null>(null)

  // Flags
  const [flagOpen,     setFlagOpen]     = useState(false)
  const [customLabel,  setCustomLabel]  = useState("")
  const [addingFlag,   setAddingFlag]   = useState("")

  // Suspending state is now handled by SuspendAccountModal — no local suspending state needed

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch(`/api/admin/billing/${accountId}`)
      if (!res.ok) throw new Error("Failed to load billing data")
      setData(await res.json())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [accountId])

  useEffect(() => { load() }, [load])

  // ── Note actions ────────────────────────────────────────────────────────────

  async function saveNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText.trim() }),
      })
      if (!res.ok) throw new Error()
      setNoteText("")
      adminToast.success("Note synchronized with corporate records")
      load()
    } catch (err) {
      adminToast.error("Failed to persist note")
    } finally {
      setSavingNote(false)
    }
  }

  async function updateNote(noteId: string, content: string) {
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/notes?noteId=${noteId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      setEditingNote(null)
      adminToast.success("Note update verified")
      load()
    } catch (err) {
      adminToast.error("Note update failure")
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/notes?noteId=${noteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      adminToast.success("Note purged from system")
      load()
    } catch (err) {
      adminToast.error("Failed to delete note")
    }
  }

  async function togglePin(noteId: string, current: boolean) {
    await fetch(`/api/admin/accounts/${accountId}/notes?noteId=${noteId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: !current }),
    })
    load()
  }

  // ── Flag actions ────────────────────────────────────────────────────────────

  async function addFlag(preset: typeof FLAG_PRESETS[number]) {
    const label     = preset.value === "custom" ? customLabel.trim() : preset.label
    const flag_type = preset.value === "custom" ? "custom" : preset.value
    if (!label) return
    setAddingFlag(preset.value)
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/flags`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag_type, label, color: preset.color }),
      })
      if (!res.ok) throw new Error()
      setFlagOpen(false); setCustomLabel(""); 
      adminToast.success(`Merchant flagged as ${label}`)
      load()
    } catch (err) {
      adminToast.error("Flag operation failed")
    } finally {
      setAddingFlag("")
    }
  }

  async function removeFlag(flagId: string) {
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/flags?flagId=${flagId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      adminToast.success("Account flag cleared")
      load()
    } catch (err) {
      adminToast.error("Failed to remove flag")
    }
  }

  // ── Generate / Send PDF ─────────────────────────────────────────────────────

  async function generatePdf(invoiceId: string) {
    const res = await fetch(`/api/admin/billing/invoices/${invoiceId}/generate-pdf`, { method: "POST" })
    const d = await res.json()
    if (d.pdfUrl) window.open(d.pdfUrl, "_blank")
    load()
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <BillingSkeleton />
  if (error) return (
    <div className="flex items-center gap-2 text-red-400 text-sm py-8">
      <AlertCircle className="w-4 h-4" />
      {error}
    </div>
  )
  if (!data) return null

  const { account, payments, invoices, flags, summary, notes } = data
  const days = summary.days_remaining

  // ─── SECTION 1: Subscription Status Bar ─────────────────────────────────────
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Modals */}
      {showPayment && (
        <RecordPaymentModal
          accountId={accountId}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); load() }}
        />
      )}
      {showPlan && (
        <ChangePlanModal
          accountId={accountId}
          currentPlanTier={account.plan_tier}
          onClose={() => setShowPlan(false)}
          onSuccess={() => { setShowPlan(false); load() }}
        />
      )}
      {showExpiry && (
        <ExtendExpiryModal
          accountId={accountId}
          currentExpiry={account.subscription_current_period_end}
          onClose={() => setShowExpiry(false)}
          onSuccess={() => { setShowExpiry(false); load() }}
        />
      )}
      {showInvoice && (
        <CreateInvoiceModal
          accountId={accountId}
          currentSubscription={account}
          onClose={() => setShowInvoice(false)}
          onSuccess={() => { setShowInvoice(false); load() }}
        />
      )}
      {showSuspend && (
        <SuspendAccountModal
          accountId={accountId}
          merchantName={(account as any).business_name ?? accountId}
          currentStatus={account.subscription_status}
          onClose={() => setShowSuspend(false)}
          onSuccess={() => { setShowSuspend(false); load() }}
        />
      )}

      {/* ── Status Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm font-sans">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

          {/* LEFT: Plan Identity */}
          <div className="space-y-2">
            <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${PLAN_STYLES[account.plan_tier] ?? PLAN_STYLES.starter}`}>
              {account.plan_tier}
            </span>
            <div className="text-foreground font-bold text-base capitalize">{account.plan_tier} Plan</div>
            <Badge
              cls={STATUS_STYLES[account.subscription_status] ?? STATUS_STYLES.cancelled}
              label={account.subscription_status.replace("_", " ")}
            />
            <div className="text-muted-foreground text-[11px] pt-1 font-medium">
              {account.dodo_subscription_id ? "via Dodo" : "Manual billing"}
            </div>
          </div>

          {/* CENTER: Days Remaining */}
          <div className="text-center space-y-1">
            {days === null ? (
              <div className="text-muted-foreground text-sm font-medium">No period set</div>
            ) : days < 0 ? (
              <>
                <div className="text-destructive font-mono text-3xl font-bold tabular-nums">{Math.abs(days)}</div>
                <div className="text-destructive text-xs font-medium">days expired</div>
              </>
            ) : (
              <>
                <div className={`font-mono text-3xl font-bold tabular-nums flex items-center justify-center gap-2 ${days < 7 ? "text-destructive" : days < 14 ? "text-amber-500" : "text-foreground"}`}>
                  {days < 7 && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />}
                  {days}
                </div>
                <div className="text-muted-foreground text-xs font-medium">days remaining</div>
              </>
            )}
            {account.subscription_current_period_end && (
              <div className="text-muted-foreground text-xs pt-1 font-mono">
                {fmt(account.last_payment_date ? account.subscription_current_period_end.slice(0, 7) + "-01" : null)} – {fmt(account.subscription_current_period_end)}
              </div>
            )}
          </div>

          {/* RIGHT: Actions */}
          <div className="flex flex-col gap-2 items-end">
            {isFinance && (
              <button onClick={() => setShowPayment(true)} className="w-full px-4 py-2 bg-[#E8400C] text-white text-xs font-semibold rounded-md hover:bg-[#c73508] transition-colors uppercase tracking-wider shadow-sm cursor-pointer">
                Record Payment
              </button>
            )}
            {isFinance && (
              <button onClick={() => setShowPlan(true)} className={`w-full ${btnGhost}`}>Change Plan</button>
            )}
            {isSuperAdmin && (
              <button onClick={() => setShowExpiry(true)} className={`w-full ${btnGhost}`}>Extend Expiry</button>
            )}
            {isFinance && (
              <button onClick={() => setShowInvoice(true)} className={`w-full ${btnGhost}`}>Create Invoice</button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => setShowSuspend(true)}
                className={`w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
                  account.subscription_status === "suspended"
                    ? "text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/5"
                    : "text-destructive border-destructive/20 hover:bg-destructive/5"
                }`}
              >
                {account.subscription_status === "suspended" ? "Reactivate" : "Suspend Account"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Payments + Invoices ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Payment History */}
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm font-sans">
          <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex justify-between items-center">
            <h3 className="text-foreground text-[10px] font-bold uppercase tracking-wider">Payment History</h3>
            <span className="text-muted-foreground text-[10px] font-mono italic">Last {payments.length}</span>
          </div>

          {payments.length === 0 ? (
            <div className="py-12 border-t border-border">
              <EmptyState 
                icon={CreditCard}
                title="NO_TRANSACTIONS"
                description="This merchant has no recorded corporate payment history."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Date", "Method", "Reference", "Amount", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(p.payment_date)}</td>
                      <td className="px-4 py-3">
                        <Badge cls={METHOD_STYLES[p.payment_method] ?? METHOD_STYLES.cash} label={p.payment_method?.replace("_", " ")} />
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {p.mpesa_code ?? p.wire_reference ?? p.dodo_payment_id ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-foreground tabular-nums">
                        {fmtAmount(p.amount_kes, p.amount_usd)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge cls={PAY_STATUS_STYLES[p.status] ?? ""} label={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary row */}
          {payments.length > 0 && (
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex gap-6 text-xs font-medium">
              <span className="text-muted-foreground">Total paid: <span className="text-emerald-500 font-mono font-bold tabular-nums">KES {summary.total_paid_kes.toLocaleString()}</span></span>
              {summary.total_paid_usd > 0 && <span className="text-muted-foreground">/ <span className="text-emerald-500 font-mono font-bold tabular-nums">USD {summary.total_paid_usd.toFixed(2)}</span></span>}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm font-sans">
          <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex justify-between items-center">
            <h3 className="text-foreground text-[10px] font-bold uppercase tracking-wider">Invoices</h3>
            {summary.overdue_count > 0 && (
              <span className="flex items-center gap-1 text-destructive text-[10px] font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> {summary.overdue_count} overdue
              </span>
            )}
          </div>

          {invoices.length === 0 ? (
            <div className="py-12 border-t border-border">
              <EmptyState 
                icon={FileText}
                title="NO_INVOICES"
                description="Corporate billing registry indicates zero historical invoices."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Invoice #", "Due", "Amount", "Status", "Actions"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv: any) => {
                    const isOverdue = inv.status === "overdue"
                    return (
                      <tr key={inv.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          {inv.pdf_url ? (
                            <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="font-mono text-xs text-[#E8400C] hover:underline flex items-center gap-1 font-bold">
                              {inv.invoice_number} <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="font-mono text-xs font-bold text-[#E8400C]">{inv.invoice_number}</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-xs ${isOverdue ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                          {fmt(inv.due_date)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono font-bold text-foreground tabular-nums">
                          {fmtAmount(inv.amount_kes, inv.amount_usd)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge cls={INV_STATUS_STYLES[inv.status] ?? ""} label={inv.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {!inv.pdf_url && (
                              <button onClick={() => generatePdf(inv.id)} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 hover:border-foreground/40 transition-all cursor-pointer">
                                PDF
                              </button>
                            )}
                            {inv.pdf_url && (
                              <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 hover:border-foreground/40 transition-all">
                                View
                              </a>
                            )}
                            {["unpaid", "overdue"].includes(inv.status) && (
                              <button className="text-[10px] font-semibold text-muted-foreground hover:text-[#E8400C] flex items-center gap-0.5 border border-border rounded px-2 py-0.5 hover:border-[#E8400C]/30 transition-all cursor-pointer">
                                <MessageSquare className="w-3 h-3" /> Send
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {summary.outstanding_kes > 0 && (
            <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs font-medium">
              <span className="text-muted-foreground">Outstanding: <span className="text-amber-500 font-mono font-bold tabular-nums">KES {summary.outstanding_kes.toLocaleString()}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Notes & Flags ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm font-sans">
        <div className="px-5 py-3.5 border-b border-border bg-muted/40">
          <h3 className="text-foreground text-[10px] font-bold uppercase tracking-wider">CRM · Notes & Flags</h3>
        </div>

        <div className="p-5 space-y-6">
          {/* Flags */}
          <div className="space-y-3">
            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Flags</div>
            <div className="flex flex-wrap items-center gap-2">
              {flags.map((flag: any) => (
                <span key={flag.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${FLAG_COLOR_MAP[flag.color] ?? FLAG_COLOR_MAP.zinc}`}>
                  {flag.label}
                  <button onClick={() => removeFlag(flag.id)} className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              {/* Add Flag dropdown */}
              <div className="relative">
                <button
                  onClick={() => setFlagOpen(f => !f)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-muted-foreground border border-dashed border-border hover:border-foreground/40 hover:text-foreground transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Flag <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {flagOpen && (
                  <div className="absolute left-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-xl w-52 py-1">
                    {FLAG_PRESETS.map(p => (
                      <div key={p.value}>
                        <button
                          onClick={() => p.value !== "custom" ? addFlag(p) : setCustomLabel("__open__")}
                          disabled={addingFlag === p.value}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className={`w-2 h-2 rounded-full inline-block ${p.value === "vip" ? "bg-amber-500" : p.value === "at_risk" ? "bg-destructive" : p.value === "trial_convert" ? "bg-blue-500" : p.value === "support_issue" ? "bg-orange-500" : "bg-muted-foreground"}`} />
                          {p.label}
                        </button>
                        {p.value === "custom" && customLabel === "__open__" && (
                          <div className="px-3 pb-2 flex gap-2">
                            <input
                              autoFocus
                              className="flex-1 bg-card border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-foreground/40"
                              placeholder="Label…"
                              value={customLabel === "__open__" ? "" : customLabel}
                              onChange={e => setCustomLabel(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && customLabel && addFlag(p)}
                            />
                            <button onClick={() => addFlag(p)} className="text-xs text-[#E8400C] font-bold cursor-pointer">Add</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Notes */}
          <div className="space-y-3">
            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Notes</div>

            {/* Note list */}
            {notes && notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note: any) => (
                    <div key={note.id} className={`group relative p-3.5 rounded-md border text-xs ${note.is_pinned ? "border-[#E8400C]/30 bg-[#E8400C]/5" : "border-border bg-muted/20"}`}>
                      {editingNote?.id === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            className={inputCls + " resize-none text-xs"}
                            rows={3}
                            value={editingNote!.content}
                            onChange={e => setEditingNote({ id: note.id, content: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => updateNote(note.id, editingNote!.content)} className="text-xs text-[#E8400C] font-bold cursor-pointer">Save</button>
                            <button onClick={() => setEditingNote(null)} className="text-xs text-muted-foreground cursor-pointer">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-foreground font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-medium">
                            {note.is_pinned && <Pin className="w-3 h-3 text-[#E8400C]" />}
                            <Clock className="w-3 h-3" />
                            <span>{relativeTime(note.created_at)}</span>
                          </div>
                          <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => togglePin(note.id, note.is_pinned)} title={note.is_pinned ? "Unpin" : "Pin"} className="cursor-pointer">
                              <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? "text-[#E8400C]" : "text-muted-foreground hover:text-foreground"}`} />
                            </button>
                            <button onClick={() => setEditingNote({ id: note.id, content: note.content })} className="cursor-pointer">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                            </button>
                            <button onClick={() => deleteNote(note.id)} className="cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs italic">No notes yet.</p>
            )}

            {/* Add note */}
            <div className="space-y-2 pt-1">
              <textarea
                className={inputCls + " resize-none"}
                rows={3}
                placeholder="Add a note about this account…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <button
                onClick={saveNote}
                disabled={savingNote || !noteText.trim()}
                className={btnPrimary}
              >
                {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
