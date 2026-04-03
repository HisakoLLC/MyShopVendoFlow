"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2, CheckCircle2, AlertCircle, ShieldAlert, ShieldCheck, Store } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAdminUser } from "@/lib/admin/AdminUserContext"

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1"
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"

// ─── Component ────────────────────────────────────────────────────────────────

interface SuspendAccountModalProps {
  accountId:     string
  merchantName:  string
  currentStatus: string
  onSuccess:     () => void
  onClose:       () => void
}

export function SuspendAccountModal({
  accountId,
  merchantName,
  currentStatus,
  onSuccess,
  onClose,
}: SuspendAccountModalProps) {
  const adminUser    = useAdminUser()
  const isSuperAdmin = adminUser.role === "super_admin"

  const [reason, setReason]   = useState("")
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState("")
  const [done, setDone]       = useState(false)
  const [confirm3, setConfirm3] = useState(false) // double-confirm for suspend
  const dirty                 = useRef(false)

  const isSuspended = currentStatus === "suspended"

  useEffect(() => { dirty.current = reason.length > 0 }, [reason])

  // Guard: never render actions for non-super_admin (component-level)
  if (!isSuperAdmin) {
    return (
      <Dialog open onOpenChange={open => !open && onClose()}>
        <DialogContent className="bg-[#111] border border-[#1f1f1f] text-white max-w-sm">
          <div className="py-6 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-xs text-[#666]">Only super_admin can suspend or reactivate accounts.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  async function submit() {
    setErr("")
    const newStatus = isSuspended ? "active" : "suspended"

    if (!isSuspended && !reason.trim())
      return setErr("A reason is required before suspending an account")
    if (!isSuspended && !confirm3)
      return setErr("Please check the confirmation checkbox to proceed")

    setSaving(true)
    try {
      const res = await fetch("/api/admin/billing/set-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          status: newStatus,
          reason: reason.trim() || `Reactivated by ${adminUser.email}`,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Request failed")

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
      if (!window.confirm("You have unsaved changes. Close anyway?")) return
    }
    if (!open) onClose()
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#111] border border-[#1f1f1f] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${isSuspended ? "text-emerald-400" : "text-red-400"}`}>
            {isSuspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {isSuspended ? "Reactivate Account" : "Suspend Account"}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className={`py-8 flex flex-col items-center gap-3 ${isSuspended ? "text-emerald-400" : "text-amber-400"}`}>
            <CheckCircle2 className="w-10 h-10" />
            <p className="text-sm font-semibold">
              {isSuspended ? "Account reactivated" : "Account suspended"}
            </p>
          </div>
        ) : isSuspended ? (
          // ── REACTIVATE VIEW ────────────────────────────────────────────────
          <div className="space-y-5 mt-1">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Reactivate {merchantName}?</p>
                  <p className="text-xs text-[#888] mt-1">
                    This will restore full access to VendoFlow for this merchant and set their subscription status back to{" "}
                    <span className="text-emerald-400 font-semibold">active</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Reason (optional)</label>
              <input
                className={inputCls}
                placeholder="e.g. Payment confirmed, access restored"
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
                className="flex-1 px-4 py-2.5 border border-[#2a2a2a] rounded-sm text-xs font-bold text-[#888] hover:border-white/20 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-emerald-500 text-black rounded-sm text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Reactivating…" : "Reactivate Account"}
              </button>
            </div>
          </div>
        ) : (
          // ── SUSPEND VIEW ───────────────────────────────────────────────────
          <div className="space-y-5 mt-1">

            {/* Impact warning card */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-400">
                    Suspending {merchantName}
                  </p>
                  <p className="text-xs text-[#888] mt-1">
                    This action will immediately block merchant access to VendoFlow.
                  </p>
                </div>
              </div>
              <div className="space-y-2 pl-8">
                {[
                  "Merchant cannot log in to the dashboard",
                  "POS terminals will be locked",
                  "All staff access will be revoked",
                  "Existing data is preserved — nothing is deleted",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-[#666]">
                    <span className="w-1 h-1 rounded-full bg-red-500/50 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Merchant name display */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-sm">
              <Store className="w-4 h-4 text-[#444]" />
              <span className="text-sm text-white font-semibold">{merchantName}</span>
              <span className="ml-auto text-[9px] font-bold uppercase text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-sm">
                Will be suspended
              </span>
            </div>

            {/* Reason — required */}
            <div className="space-y-1">
              <label className={labelCls}>Reason <span className="text-red-500">*</span></label>
              <textarea
                className={inputCls + " resize-none"}
                rows={3}
                placeholder="e.g. Account overdue for 60+ days, no response to reminders"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            {/* Double-confirm checkbox */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-sm border border-red-500/20 bg-red-500/5">
              <input
                type="checkbox"
                checked={confirm3}
                onChange={e => setConfirm3(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-red-500"
              />
              <span className="text-xs text-[#888]">
                I understand this will immediately block all access for <span className="text-white font-semibold">{merchantName}</span> and I have verified the reason.
              </span>
            </label>

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
                disabled={saving || !confirm3 || !reason.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-sm text-xs font-black uppercase tracking-widest hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Suspending…" : "Suspend Account"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
