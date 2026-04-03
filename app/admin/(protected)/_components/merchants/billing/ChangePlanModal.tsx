"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAdminUser } from "@/lib/admin/AdminUserContext"

// ─── Plan data ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:       "starter",
    name:     "Starter",
    priceKes: 11_600,
    desc:     "1 store · 500 styles · 2 staff",
    color:    "zinc",
  },
  {
    id:       "core",
    name:     "Core",
    priceKes: 18_000,
    desc:     "3 stores · Unlimited · 10 staff",
    color:    "blue",
  },
  {
    id:       "scale",
    name:     "Scale",
    priceKes: 29_900,
    desc:     "10 stores · Unlimited · Unlimited",
    color:    "purple",
  },
] as const

type PlanId = (typeof PLANS)[number]["id"] | "trial"

const BILLING_CYCLES = [
  { id: "monthly",   label: "Monthly",   months: 1,  discount: 0 },
  { id: "quarterly", label: "Quarterly", months: 3,  discount: 0.05 },
  { id: "annual",    label: "Annual",    months: 12, discount: 0.20 },
] as const

type CycleId = (typeof BILLING_CYCLES)[number]["id"]

const PLAN_BORDER: Record<string, string> = {
  starter: "border-zinc-500 bg-zinc-500/5",
  core:    "border-blue-500 bg-blue-500/5",
  scale:   "border-purple-500 bg-purple-500/5",
  trial:   "border-amber-500 bg-amber-500/5",
}

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1"
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"

function addMonths(base: string, months: number): string {
  const d = new Date(base)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split("T")[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChangePlanModalProps {
  accountId:       string
  currentPlanTier: string
  onSuccess:       () => void
  onClose:         () => void
}

export function ChangePlanModal({
  accountId,
  currentPlanTier,
  onSuccess,
  onClose,
}: ChangePlanModalProps) {
  const adminUser    = useAdminUser()
  const isSuperAdmin = adminUser.role === "super_admin"

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(currentPlanTier as PlanId)
  const [cycle, setCycle]               = useState<CycleId>("monthly")
  const [newPeriodEnd, setNewPeriodEnd]  = useState(addMonths(new Date().toISOString().split("T")[0], 1))
  const [reason, setReason]             = useState("")
  const [saving, setSaving]             = useState(false)
  const [err, setErr]                   = useState("")
  const [done, setDone]                 = useState(false)
  const dirty                           = useRef(false)

  useEffect(() => { dirty.current = true }, [selectedPlan, cycle, reason])

  // Auto-calculate period end from cycle
  useEffect(() => {
    const c = BILLING_CYCLES.find(c => c.id === cycle)
    if (c) setNewPeriodEnd(addMonths(new Date().toISOString().split("T")[0], c.months))
  }, [cycle])

  // Total price calculation
  const planData  = PLANS.find(p => p.id === selectedPlan)
  const cycleData = BILLING_CYCLES.find(c => c.id === cycle)
  const baseTotal = planData && cycleData
    ? planData.priceKes * cycleData.months
    : 0
  const discount  = cycleData?.discount ?? 0
  const finalTotal = Math.round(baseTotal * (1 - discount))

  async function submit() {
    setErr("")
    if (!reason.trim()) return setErr("A reason is required")

    setSaving(true)
    try {
      const res = await fetch("/api/admin/billing/set-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          planTier:     selectedPlan,
          newPeriodEnd,
          reason:       reason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to change plan")

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

  const visiblePlans = isSuperAdmin
    ? [...PLANS, { id: "trial" as const, name: "Trial", priceKes: 0, desc: "Free trial period", color: "amber" }]
    : PLANS

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#111] border border-[#1f1f1f] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-sm font-bold uppercase tracking-widest">
            Change Plan
          </DialogTitle>
          <p className="text-[#555] text-xs pt-1">
            Current plan: <span className="text-white font-semibold capitalize">{currentPlanTier}</span>
          </p>
        </DialogHeader>

        {done ? (
          <div className="py-8 flex flex-col items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
            <p className="text-sm font-semibold">Plan updated successfully</p>
          </div>
        ) : (
          <div className="space-y-5 mt-1">

            {/* Plan cards */}
            <div className="space-y-2">
              <label className={labelCls}>Select Plan</label>
              <div className="grid grid-cols-2 gap-3">
                {visiblePlans.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id as PlanId)}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      selectedPlan === plan.id
                        ? PLAN_BORDER[plan.id] ?? "border-zinc-500 bg-zinc-500/5"
                        : "border-[#2a2a2a] bg-[#0d0d0d] hover:border-[#333]"
                    }`}
                  >
                    <div className={`text-sm font-black uppercase tracking-wider mb-0.5 ${
                      selectedPlan === plan.id ? "text-white" : "text-[#666]"
                    }`}>
                      {plan.name}
                    </div>
                    <div className="text-[11px] font-bold text-[#22c55e] mb-1">
                      {plan.id === "trial" ? "Free" : `KES ${plan.priceKes.toLocaleString()}/mo`}
                    </div>
                    <div className="text-[10px] text-[#555]">{plan.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Billing cycle (not for trial) */}
            {selectedPlan !== "trial" && (
              <div className="space-y-2">
                <label className={labelCls}>Billing Cycle</label>
                <div className="grid grid-cols-3 gap-2">
                  {BILLING_CYCLES.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCycle(c.id)}
                      className={`p-2.5 rounded-sm border text-center transition-all ${
                        cycle === c.id
                          ? "border-[#22c55e] bg-[#22c55e]/5"
                          : "border-[#2a2a2a] bg-[#0d0d0d] hover:border-[#333]"
                      }`}
                    >
                      <div className={`text-xs font-bold ${cycle === c.id ? "text-white" : "text-[#666]"}`}>
                        {c.label}
                      </div>
                      {c.discount > 0 && (
                        <div className="text-[9px] text-[#22c55e] font-bold mt-0.5">
                          -{Math.round(c.discount * 100)}%
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {planData && (
                  <div className="text-xs text-[#22c55e] font-bold pt-1 text-center">
                    Total: KES {finalTotal.toLocaleString()} for {cycleData?.months} month{(cycleData?.months ?? 1) > 1 ? "s" : ""}
                    {discount > 0 && <span className="text-[#555] font-normal ml-2">(saves KES {(baseTotal - finalTotal).toLocaleString()})</span>}
                  </div>
                )}
              </div>
            )}

            {/* Period end */}
            <div className="space-y-1">
              <label className={labelCls}>New Period End</label>
              <input
                className={inputCls}
                type="date"
                value={newPeriodEnd}
                onChange={e => setNewPeriodEnd(e.target.value)}
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className={labelCls}>Reason <span className="text-red-500">*</span></label>
              <textarea
                className={inputCls + " resize-none"}
                rows={3}
                placeholder="e.g. Merchant requested upgrade via email, invoice #VF-042"
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
                className="flex-1 px-4 py-2.5 bg-[#22c55e] text-black rounded-sm text-xs font-black uppercase tracking-widest hover:bg-[#1eb054] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Applying…" : "Apply Change"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
