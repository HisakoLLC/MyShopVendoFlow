"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1"
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"

// Plan prices for pre-filling
const PLAN_PRICES: Record<string, number> = {
  starter: 10_200,
  core:    16_500,
  scale:   35_000,
  trial:    0,
}

function addDays(base: string, n: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CreateInvoiceModalProps {
  accountId:           string
  currentSubscription: {
    plan_tier:                       string
    subscription_current_period_end: string | null
  }
  onSuccess: (invoiceNumber?: string) => void
  onClose:   () => void
}

export function CreateInvoiceModal({
  accountId,
  currentSubscription,
  onSuccess,
  onClose,
}: CreateInvoiceModalProps) {
  const today = new Date().toISOString().split("T")[0]

  const [amountKes, setAmountKes] = useState(
    String(PLAN_PRICES[currentSubscription.plan_tier] ?? "")
  )
  const [dueDate, setDueDate]         = useState(addDays(today, 7))
  const [periodStart, setPeriodStart] = useState(today)
  const [periodEnd, setPeriodEnd]     = useState(
    currentSubscription.subscription_current_period_end
      ? currentSubscription.subscription_current_period_end.split("T")[0]
      : addDays(today, 30)
  )
  const [notes, setNotes]             = useState("")
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState("")
  const [done, setDone]               = useState(false)
  const [createdNumber, setCreatedNumber] = useState("")
  const dirty                         = useRef(false)

  useEffect(() => { dirty.current = true }, [amountKes, dueDate, periodStart, periodEnd, notes])

  async function submit() {
    setErr("")
    if (!amountKes || Number(amountKes) <= 0)
      return setErr("Amount must be greater than 0")
    if (!dueDate) return setErr("Due date is required")
    if (!periodStart || !periodEnd) return setErr("Period start and end are required")
    if (periodEnd <= periodStart) return setErr("Period end must be after period start")

    setSaving(true)
    try {
      const res = await fetch("/api/admin/billing/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          amountKes:   Number(amountKes),
          dueDate,
          periodStart,
          periodEnd,
          notes:       notes.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create invoice")

      setCreatedNumber(data.invoice?.invoice_number ?? "")
      setDone(true)
      dirty.current = false
      setTimeout(() => {
        onSuccess(data.invoice?.invoice_number)
        onClose()
      }, 1200)
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

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#111] border border-[#1f1f1f] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Create Invoice
          </DialogTitle>
          <p className="text-[#555] text-xs pt-1">
            Plan: <span className="text-white font-semibold capitalize">{currentSubscription.plan_tier}</span>
          </p>
        </DialogHeader>

        {done ? (
          <div className="py-8 flex flex-col items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
            <p className="text-sm font-semibold">Invoice created</p>
            {createdNumber && (
              <p className="text-xs text-[#888]">
                Invoice number: <span className="font-mono text-white">{createdNumber}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-1">

            {/* Amount */}
            <div className="space-y-1">
              <label className={labelCls}>Amount (KES) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm font-bold">KES</span>
                <input
                  className={inputCls + " pl-12"}
                  type="number"
                  min={1}
                  placeholder={String(PLAN_PRICES[currentSubscription.plan_tier] ?? "0")}
                  value={amountKes}
                  onChange={e => setAmountKes(e.target.value)}
                />
              </div>
              {amountKes && (
                <p className="text-[10px] text-[#555] pl-1">
                  = KES {Number(amountKes).toLocaleString()}
                </p>
              )}
            </div>

            {/* Due date */}
            <div className="space-y-1">
              <label className={labelCls}>Due Date <span className="text-red-500">*</span></label>
              <input
                className={inputCls}
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Period Start <span className="text-red-500">*</span></label>
                <input
                  className={inputCls}
                  type="date"
                  value={periodStart}
                  onChange={e => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Period End <span className="text-red-500">*</span></label>
                <input
                  className={inputCls}
                  type="date"
                  value={periodEnd}
                  min={periodStart}
                  onChange={e => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className={labelCls}>Notes (optional)</label>
              <textarea
                className={inputCls + " resize-none"}
                rows={2}
                placeholder="e.g. Monthly subscription — Core plan"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/5 border border-red-400/20 rounded-sm p-3">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {err}
              </div>
            )}

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
                className="flex-1 px-4 py-2.5 bg-[#22c55e] text-black rounded-sm text-xs font-black uppercase tracking-widest hover:bg-[#1eb054] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Creating…" : "Create Invoice"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
