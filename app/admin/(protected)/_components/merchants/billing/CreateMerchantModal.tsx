"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Building2,
  User,
  Smartphone,
  Globe,
  Store,
  Check,
  ShieldCheck,
  MessageSquare
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { adminToast } from "@/lib/admin/toast"

// --- Plan Data (Matching ChangePlanModal) ---
const PLANS = [
  { id: "starter", name: "Starter", priceKes: 11600, desc: "1 store · 500 styles · 2 staff", color: "zinc" },
  { id: "core",    name: "Core",    priceKes: 18000, desc: "3 stores · Unlimited · 10 staff", color: "blue" },
  { id: "scale",   name: "Scale",   priceKes: 29900, desc: "10 stores · Unlimited · Unlimited", color: "purple" },
  { id: "trial",   name: "Trial",   priceKes: 0,     desc: "30-day Free Trial", color: "amber" },
] as const

const PLAN_BORDER: Record<string, string> = {
  starter: "border-border bg-muted/20",
  core:    "border-blue-500 bg-blue-500/5",
  scale:   "border-purple-500 bg-purple-500/5",
  trial:    "border-amber-500 bg-amber-500/5",
}

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1"
const inputCls = "w-full bg-background border border-input rounded-sm px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"

interface CreateMerchantModalProps {
  isOpen:  boolean
  onClose: () => void
}

export default function CreateMerchantModal({ isOpen, onClose }: CreateMerchantModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailError, setEmailError] = useState("")

  // Form State
  const [form, setForm] = useState({
    businessName: "",
    ownerName:    "",
    ownerEmail:   "",
    ownerPhone:   "",
    city:         "",
    planTier:     "trial" as string,
    storeName:    "",
    sendWelcomeWhatsapp: true
  })

  // Auto-fill store name when business name changes
  useEffect(() => {
    if (step === 1) {
      setForm(prev => ({ ...prev, storeName: `${prev.businessName.trim()} Store` }))
    }
  }, [form.businessName, step])

  const validateEmail = async (email: string) => {
    if (!email || !email.includes("@")) return
    setIsCheckingEmail(true)
    setEmailError("")
    try {
      const res = await fetch(`/api/admin/accounts/check-email?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      if (data.exists) {
        setEmailError("This email already has a VendoFlow account")
      }
    } catch (e) {
      console.error("Email check failed")
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const isStep1Valid = 
    form.businessName.trim() && 
    form.ownerName.trim() && 
    form.ownerEmail.trim() && 
    !emailError && 
    !isCheckingEmail

  const handleSubmit = async () => {
    setLoading(true)
    const toastId = adminToast.loading("Creating account...")
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Creation failed")

      adminToast.success(`Account created for ${form.businessName}`)
      onClose()
      router.push(`/admin/merchants/${data.account.account_id}?tab=billing`)
    } catch (err: any) {
      adminToast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && !open && onClose()}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] bg-background border border-border text-foreground p-0 overflow-hidden shadow-2xl">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: step === 1 ? "50%" : "100%" }} 
          />
        </div>

        {/* Header */}
        <div className="px-8 py-6 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="space-y-1">
             <DialogTitle className="text-foreground text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
               New Merchant Onboarding
             </DialogTitle>
             <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Step {step}: {step === 1 ? "Business Credentials" : "Setup Protocol"}</p>
          </div>
          <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {step === 1 ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Identity Section */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className={labelCls}>Business Legal Name <span className="text-red-500/50">*</span></label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Nairobi Fashion House"
                    value={form.businessName}
                    onChange={e => setForm({ ...form, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Owner Full Name <span className="text-red-500/50">*</span></label>
                  <input
                    className={inputCls}
                    placeholder="e.g. John Kamau"
                    value={form.ownerName}
                    onChange={e => setForm({ ...form, ownerName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Owner Email <span className="text-red-500/50">*</span></label>
                  <div className="relative">
                    <input
                      className={`${inputCls} ${emailError ? "border-red-500/50" : ""}`}
                      type="email"
                      placeholder="owner@business.com"
                      value={form.ownerEmail}
                      onChange={e => {
                        setForm({ ...form, ownerEmail: e.target.value })
                        setEmailError("")
                      }}
                      onBlur={e => validateEmail(e.target.value)}
                    />
                    {isCheckingEmail && (
                      <Loader2 className="absolute right-3 top-3 w-4 h-4 text-muted-foreground animate-spin" />
                    )}
                  </div>
                  {emailError && (
                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-tighter mt-1">{emailError}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Owner Phone</label>
                  <input
                    className={inputCls}
                    placeholder="+254..."
                    value={form.ownerPhone}
                    onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 col-span-full">
                  <label className={labelCls}>City</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Nairobi"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                  />
                </div>
              </div>

              {/* Plan Cards */}
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Subscription Blueprint</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {PLANS.map(plan => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setForm({ ...form, planTier: plan.id })}
                        className={`text-left p-5 rounded border transition-all relative group ${
                          form.planTier === plan.id
                            ? PLAN_BORDER[plan.id]
                            : "border-border bg-background/50 hover:border-border"
                        }`}
                      >
                         <div className={`text-xs font-black uppercase tracking-widest mb-1 ${
                          form.planTier === plan.id ? "text-foreground" : "text-muted-foreground group-hover:text-muted"
                        }`}>
                          {plan.name}
                        </div>
                        <div className="text-[10px] text-primary font-bold mb-2">
                          {plan.id === "trial" ? "FREE" : `KES ${plan.priceKes.toLocaleString()}/mo`}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-medium leading-relaxed uppercase tracking-tighter">
                          {plan.desc}
                        </div>
                        {form.planTier === plan.id && (
                          <div className="absolute top-4 right-4 text-primary">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
               {/* Setup Options */}
               <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-1.5 text-left">
                     <label className={labelCls}>Initial Store Name</label>
                     <input
                        className={inputCls}
                        value={form.storeName}
                        onChange={e => setForm({ ...form, storeName: e.target.value })}
                     />
                     <p className="text-[9px] text-muted-foreground font-bold uppercase italic tracking-tighter pt-1">Every account starts with at least one store location.</p>
                  </div>

                  <div className={`p-6 rounded border transition-all ${
                    !form.ownerPhone ? "border-border opacity-50 bg-muted/20" : "border-border bg-background"
                  }`}>
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2 text-foreground text-xs font-bold uppercase tracking-widest">
                             <MessageSquare className="w-3.5 h-3.5 text-primary" />
                             Welcome WhatsApp
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium">Send onboarding activation code to the merchant automatically.</p>
                       </div>
                       <button
                          onClick={() => form.ownerPhone && setForm({ ...form, sendWelcomeWhatsapp: !form.sendWelcomeWhatsapp })}
                          disabled={!form.ownerPhone}
                          className={`relative w-10 h-5 rounded-full transition-colors flex items-center px-1 ${
                            form.sendWelcomeWhatsapp ? "bg-primary" : "bg-muted"
                          }`}
                       >
                          <div className={`w-3.5 h-3.5 bg-background rounded-full transition-transform ${
                            form.sendWelcomeWhatsapp ? "translate-x-4.5" : "translate-x-0"
                          }`} />
                       </button>
                    </div>
                  </div>
               </div>

               {/* Summary Card */}
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Deployment Summary</h3>
                  <div className="bg-muted/30 border border-border rounded overflow-hidden">
                     <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border">
                        <div className="p-4 space-y-1">
                           <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Business</span>
                           <div className="text-xs text-foreground font-bold">{form.businessName}</div>
                        </div>
                        <div className="p-4 space-y-1">
                           <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Owner</span>
                           <div className="text-xs text-foreground font-bold">{form.ownerName} ({form.ownerEmail})</div>
                        </div>
                        <div className="p-4 space-y-1">
                           <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Plan</span>
                           <div className="text-xs text-foreground font-bold uppercase flex items-center gap-2">
                             {form.planTier}
                             <div className={`w-1.5 h-1.5 rounded-full ${
                               form.planTier === "trial" ? "bg-amber-400" : (form.planTier === "scale" ? "bg-purple-400" : "bg-blue-400")
                             }`} />
                           </div>
                        </div>
                        <div className="p-4 space-y-1">
                           <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Store</span>
                           <div className="text-xs text-foreground font-bold">{form.storeName}</div>
                        </div>
                     </div>
                     <div className="bg-muted px-6 py-4 flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] italic">Ready for ecosystem injection</span>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-border bg-muted/30 flex justify-between items-center">
          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
          </div>
          <div className="flex gap-4">
             <button
               onClick={onClose}
               className="px-6 py-3 rounded border border-input bg-background text-foreground text-[11px] font-black uppercase tracking-widest hover:bg-accent transition-all"
               disabled={loading}
             >
               Cancel
             </button>
             {step === 1 ? (
               <button
                 onClick={() => isStep1Valid && setStep(2)}
                 disabled={!isStep1Valid}
                 className="px-8 py-3 bg-primary text-primary-foreground rounded text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
               >
                 Next
                 <ChevronRight className="w-4 h-4" />
               </button>
             ) : (
               <button
                 onClick={handleSubmit}
                 disabled={loading}
                 className="px-8 py-3 bg-primary text-primary-foreground rounded text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                 Create Account
               </button>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
