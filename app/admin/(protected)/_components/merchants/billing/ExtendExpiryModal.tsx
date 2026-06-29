"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2, CheckCircle2, AlertCircle, CalendarDays, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1"
const inputCls =
  "w-full bg-background border border-input rounded-sm px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "Not set"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ExtendExpiryModalProps {
  accountId:      string
  currentExpiry:  string | null
  onSuccess:      () => void
  onClose:        () => void
}

export function ExtendExpiryModal({
  accountId,
  currentExpiry,
  onSuccess,
  onClose,
}: ExtendExpiryModalProps) {
  const today        = new Date().toISOString().split("T")[0]
  const defaultNew   = (() => {
    const base = currentExpiry ?? today
    const d    = new Date(base)
    d.setDate(d.getDate() + 30)
    return d.toISOString().split("T")[0]
  })()

  const [newExpiry, setNewExpiry] = useState(defaultNew)
  const [reason, setReason]       = useState("")
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState("")
  const [done, setDone]           = useState(false)
  const dirty                     = useRef(false)

  useEffect(() => { dirty.current = true }, [newExpiry, reason])

  // Days extending by
  const extending = currentExpiry && newExpiry
    ? diffDays(currentExpiry, newExpiry)
    : null

  const isValidDate = newExpiry && (!currentExpiry || newExpiry > currentExpiry)

  async function submit() {
    setErr("")
    if (!reason.trim()) return setErr("A reason is required")
    if (!isValidDate)   return setErr("New expiry must be after the current expiry date")

    setSaving(true)
    try {
      const res = await fetch("/api/admin/billing/extend-expiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          newExpiryDate: newExpiry,
          reason:        reason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to extend expiry")

      setDone(true)
      dirty.current = false
      setTimeout(() => { onSuccess(); onClose() }, 900)
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
      <DialogContent className="bg-background border border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground text-sm font-bold uppercase tracking-widest">
            Extend Subscription Expiry
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-8 flex flex-col items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
            <p className="text-sm font-semibold">Expiry extended successfully</p>
          </div>
        ) : (
          <div className="space-y-5 mt-1">

            {/* Current expiry display */}
            <div className="bg-muted border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Current Expiry</div>
                  <div className="text-foreground font-semibold text-sm flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    {fmtDate(currentExpiry)}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-0.5 text-right">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">New Expiry</div>
                  <div className={`font-semibold text-sm ${isValidDate ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {newExpiry ? fmtDate(newExpiry) : "—"}
                  </div>
                </div>
              </div>

              {extending !== null && extending > 0 && (
                <div className="text-center text-xs text-[#22c55e] font-bold bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-sm py-1.5">
                  Extending by {extending} day{extending !== 1 ? "s" : ""}
                </div>
              )}
              {extending !== null && extending <= 0 && (
                <div className="text-center text-xs text-red-400 font-bold bg-red-400/5 border border-red-400/20 rounded-sm py-1.5">
                  New date must be after current expiry
                </div>
              )}
            </div>

            {/* New date picker */}
            <div className="space-y-1">
              <label className={labelCls}>New Expiry Date</label>
              <input
                className={inputCls}
                type="date"
                value={newExpiry}
                min={currentExpiry ?? today}
                onChange={e => setNewExpiry(e.target.value)}
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className={labelCls}>Reason <span className="text-red-500">*</span></label>
              <textarea
                className={inputCls + " resize-none"}
                rows={3}
                placeholder="e.g. Grace period granted due to M-Pesa processing delay"
                value={reason}
                onChange={e => setReason(e.target.value)}
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
                className="flex-1 px-4 py-2.5 border border-input bg-background rounded-sm text-xs font-bold text-foreground hover:bg-accent transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || !isValidDate}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Extending…" : "Extend Expiry"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
