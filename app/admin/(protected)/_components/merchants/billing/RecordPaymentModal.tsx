"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1"

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-3">{children}</div>
}

function Divider() {
  return <div className="border-t border-[#1f1f1f]" />
}

function ErrorMsg({ msg }: { msg: string }) {
  return msg ? (
    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/5 border border-red-400/20 rounded-sm p-3">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {msg}
    </div>
  ) : null
}

const today = () => new Date().toISOString().split("T")[0]
const addDays = (d: string, n: number) => {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().split("T")[0]
}
const diffDays = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)

// Payment method styles
const METHODS = [
  { id: "mpesa", label: "M-Pesa", color: "emerald" },
  { id: "wire",  label: "Wire Transfer", color: "blue" },
  { id: "cash",  label: "Cash", color: "amber" },
  { id: "waived",label: "Waived", color: "purple" },
] as const

type Method = (typeof METHODS)[number]["id"]

// ─── RecordPaymentModal ───────────────────────────────────────────────────────

interface RecordPaymentModalProps {
  accountId: string
  onSuccess: () => void
  onClose: () => void
}

export function RecordPaymentModal({
  accountId,
  onSuccess,
  onClose,
}: RecordPaymentModalProps) {
  // Form state
  const [method, setMethod]       = useState<Method>("mpesa")
  const [amountKes, setAmountKes] = useState("")
  const [mpesaCode, setMpesaCode] = useState("")
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [wireRef, setWireRef]     = useState("")
  const [waivedReason, setWaivedReason] = useState("")
  const [payDate, setPayDate]     = useState(today())
  const [periodStart, setPeriodStart] = useState(today())
  const [periodEnd, setPeriodEnd] = useState(addDays(today(), 30))
  const [extendSub, setExtendSub] = useState(true)
  const [invoiceId, setInvoiceId] = useState("")
  const [notes, setNotes]         = useState("")
  const [genPdf, setGenPdf]       = useState(false)

  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState("")
  const [done, setDone]     = useState(false)
  const dirty = useRef(false)

  // Mark dirty when any field changes
  useEffect(() => { dirty.current = true }, [method, amountKes, mpesaCode, wireRef, waivedReason, payDate, periodStart, periodEnd, notes])

  // Load unpaid invoices
  useEffect(() => {
    fetch(`/api/admin/billing/${accountId}`)
      .then(r => r.json())
      .then(d => setUnpaidInvoices((d.invoices ?? []).filter((i: any) => ["unpaid", "overdue"].includes(i.status))))
      .catch(() => {})
  }, [accountId])

  // Auto-sync period end when start changes
  useEffect(() => {
    setPeriodEnd(addDays(periodStart, 30))
  }, [periodStart])

  // Waived: force amount to 0
  const displayAmount = method === "waived" ? "0" : amountKes

  async function submit() {
    setErr("")

    // Validation
    if (method === "mpesa" && !mpesaCode.trim())
      return setErr("M-Pesa transaction code is required")
    if (method === "wire" && !wireRef.trim())
      return setErr("Wire reference is required")
    if (method === "waived" && !waivedReason.trim())
      return setErr("A reason is required for waived payments")
    if (method !== "waived" && !amountKes)
      return setErr("Amount is required")

    setSaving(true)
    try {
      const res = await fetch("/api/admin/billing/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          amountKes:    method === "waived" ? 0 : Number(amountKes),
          paymentMethod: method,
          mpesaCode:    method === "mpesa" ? mpesaCode.toUpperCase().trim() : null,
          mpesaPhone:   method === "mpesa" ? mpesaPhone.trim() || null : null,
          wireReference: method === "wire" ? wireRef.trim() : null,
          paymentDate:  payDate,
          periodStart,
          periodEnd,
          invoiceId:    invoiceId || null,
          extendSubscription: extendSub,
          notes:        method === "waived"
            ? `WAIVED: ${waivedReason}${notes ? " · " + notes : ""}`
            : notes || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to record payment")

      setDone(true)
      dirty.current = false

      // Auto-generate PDF if requested
      if (genPdf && data.payment?.id) {
        // If an invoice was linked, generate PDF for it
        const targetInvoiceId = invoiceId || null
        if (targetInvoiceId) {
          await fetch(`/api/admin/billing/invoices/${targetInvoiceId}/generate-pdf`, {
            method: "POST",
          })
        }
      }

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 900)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open && dirty.current && !done) {
      if (!confirm("You have unsaved changes. Close anyway?")) return
    }
    if (!open) onClose()
  }

  const methodColors: Record<Method, string> = {
    mpesa:  "border-emerald-500 bg-emerald-500/5",
    wire:   "border-blue-500 bg-blue-500/5",
    cash:   "border-amber-500 bg-amber-500/5",
    waived: "border-purple-500 bg-purple-500/5",
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#111] border border-[#1f1f1f] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-sm font-bold uppercase tracking-widest">
            Record Payment
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-8 flex flex-col items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
            <p className="text-sm font-semibold">Payment recorded successfully</p>
          </div>
        ) : (
          <div className="space-y-5 mt-1">

            {/* Payment Method — radio cards */}
            <div className="space-y-2">
              <label className={labelCls}>Payment Method <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-sm border text-left transition-all text-sm font-semibold ${
                      method === m.id
                        ? methodColors[m.id]
                        : "border-[#2a2a2a] bg-[#0d0d0d] text-[#666] hover:border-[#333] hover:text-[#888]"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      method === m.id ? "border-current" : "border-[#444]"
                    }`}>
                      {method === m.id && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </span>
                    <span className={method === m.id ? "text-white" : ""}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Divider />

            {/* Conditional method fields */}
            {method === "mpesa" && (
              <Row>
                <Field label="M-Pesa Code" required>
                  <input
                    className={inputCls}
                    placeholder="QXYZ123456"
                    value={mpesaCode}
                    onChange={e => setMpesaCode(e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="M-Pesa Phone">
                  <input
                    className={inputCls}
                    placeholder="+254700000000"
                    value={mpesaPhone}
                    onChange={e => setMpesaPhone(e.target.value)}
                  />
                </Field>
              </Row>
            )}

            {method === "wire" && (
              <Field label="Wire Reference" required>
                <input
                  className={inputCls}
                  placeholder="TXN-XXXXXXXXXX"
                  value={wireRef}
                  onChange={e => setWireRef(e.target.value)}
                />
              </Field>
            )}

            {method === "waived" && (
              <Field label="Waived Reason" required>
                <input
                  className={inputCls}
                  placeholder="e.g. Goodwill credit for service disruption"
                  value={waivedReason}
                  onChange={e => setWaivedReason(e.target.value)}
                />
              </Field>
            )}

            {/* Amount */}
            <Field label={method === "waived" ? "Amount (auto-set to 0)" : "Amount (KES)"} required={method !== "waived"}>
              <input
                className={inputCls}
                type="number"
                min={0}
                placeholder="e.g. 3500"
                value={displayAmount}
                disabled={method === "waived"}
                onChange={e => setAmountKes(e.target.value)}
              />
            </Field>

            <Divider />

            {/* Dates */}
            <Row3>
              <Field label="Payment Date">
                <input className={inputCls} type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </Field>
              <Field label="Period Start">
                <input className={inputCls} type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
              </Field>
              <Field label="Period End">
                <input className={inputCls} type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
              </Field>
            </Row3>

            {/* Extend subscription toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setExtendSub(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${extendSub ? "bg-[#22c55e]" : "bg-[#333]"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${extendSub ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-xs text-[#888] group-hover:text-white transition-colors">
                Extend subscription to period end
              </span>
            </label>

            <Divider />

            {/* Link to invoice */}
            {unpaidInvoices.length > 0 && (
              <Field label="Link to Invoice (optional)">
                <div className="relative">
                  <select
                    className={inputCls + " appearance-none pr-8"}
                    value={invoiceId}
                    onChange={e => setInvoiceId(e.target.value)}
                  >
                    <option value="">— Select invoice —</option>
                    {unpaidInvoices.map((inv: any) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} · KES {Number(inv.amount_kes ?? 0).toLocaleString()} · {inv.status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none" />
                </div>
              </Field>
            )}

            {/* Notes */}
            <Field label="Notes (optional)">
              <textarea
                className={inputCls + " resize-none"}
                rows={2}
                placeholder="Internal notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </Field>

            {/* Generate & Send Invoice PDF */}
            {invoiceId && (
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-sm border border-[#2a2a2a] bg-[#0d0d0d] hover:border-[#333] transition-colors">
                <input
                  type="checkbox"
                  checked={genPdf}
                  onChange={e => setGenPdf(e.target.checked)}
                  className="w-4 h-4 accent-[#22c55e]"
                />
                <div>
                  <div className="text-xs text-white font-semibold">Generate & Send Invoice PDF</div>
                  <div className="text-[10px] text-[#555]">After saving, auto-generate PDF and open WhatsApp send dialog</div>
                </div>
              </label>
            )}

            <ErrorMsg msg={err} />

            {/* Footer */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="flex-1 px-4 py-2.5 border border-[#2a2a2a] rounded-sm text-xs font-bold text-[#888] hover:border-white/20 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#22c55e] text-black rounded-sm text-xs font-black uppercase tracking-widest hover:bg-[#1eb054] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Recording…" : `Record ${method === "waived" ? "Waiver" : "Payment"}`}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
