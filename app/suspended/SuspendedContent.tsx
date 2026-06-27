"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, LogOut, Phone, Mail, MessageCircle, ArrowRight, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast, Toaster } from "sonner"
import { checkSubscriptionStatusAction, type SuspensionData } from "./actions"
import { cn } from "@/lib/utils"

export function SuspendedContent({ initialData }: { initialData: SuspensionData | null }) {
  const router = useRouter()
  const [isChecking, setIsChecking] = React.useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleCheckStatus = async () => {
    setIsChecking(true)
    try {
      const result = await checkSubscriptionStatusAction()
      if (result.success && result.redirect) {
        toast.success("Welcome back! Your account is active.")
        router.push(result.redirect)
        return
      }
      toast.error(result.message || "Account still suspended.")
    } catch (error) {
      toast.error("Failed to check status. Please try again.")
    } finally {
      setIsChecking(false)
    }
  }

  // Format Date: 15 March 2026
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  // Format Amount: KES X,XXX
  const formatAmount = (amount: number) => {
    return `KES ${amount.toLocaleString()}`
  }

  // Status Badge Logic
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "suspended":
      case "cancelled":
        return <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-tighter">Suspended</span>
      case "past_due":
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-tighter">Payment Overdue</span>
      case "expired":
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-tighter">Expired</span>
      default:
        return <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[9px] font-black uppercase tracking-tighter">{status}</span>
    }
  }

  // Plan Formatting
  const formatPlan = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1) + " Plan"
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 lg:p-12 select-none relative overflow-hidden">
      <Toaster richColors position="top-right" />
      
      {/* Background Watermark */}
      <div className="absolute top-10 left-10 opacity-[0.03] pointer-events-none hidden lg:block">
        <h1 className="font-sans text-[12vw] leading-none text-foreground uppercase font-black">
          Suspended
        </h1>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start relative z-10">
        
        {/* Left Side: Header & Info */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
              <AlertCircle className="w-3 h-3" />
              Account Suspended
            </div>
            
            <h2 className="font-sans tracking-tight text-5xl md:text-7xl font-bold text-foreground leading-[1.1]">
              Service has been <span className="italic opacity-50 underline decoration-1 underline-offset-8">paused</span>.
            </h2>
            
            <p className="text-sm md:text-base text-muted-foreground font-medium leading-relaxed max-w-md">
              Your VendoFlow subscription has expired or a billing issue was detected. 
              Your data is safe — restore access in minutes by renewing your subscription.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            <Button
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="w-full bg-[#E8400C] text-white hover:bg-[#c73508] rounded-lg h-14 text-[11px] font-black uppercase tracking-[0.2em] shadow-sm transition-all active:scale-95 border-none"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Status...
                </>
              ) : (
                "Check Status Again"
              )}
            </Button>
            
            <Button
              asChild
              variant="outline"
              className="w-full border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent h-14 text-[11px] font-black uppercase tracking-[0.2em] rounded-lg"
            >
              <a href="mailto:support@vendoflow.com">Contact Support</a>
            </Button>

            <div className="text-center">
              <button
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Sign Out of Account
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Details & Cards */}
        <div className="space-y-6">
          
          {/* Section 2: What Happened Card */}
          <div className="bg-card border border-border text-card-foreground rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="text-[9px] font-mono opacity-50">01</span> Account Details
            </h3>
            
            {initialData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account</span>
                  <span className="text-[11px] font-black text-foreground">{initialData.accountName}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plan</span>
                  <span className="text-[11px] font-black text-foreground">{formatPlan(initialData.plan)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                  {getStatusBadge(initialData.status)}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Access Ended</span>
                  <span className="text-[11px] font-black text-foreground">{formatDate(initialData.accessEnded)}</span>
                </div>
                {initialData.amountDue > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount Due</span>
                    <span className="text-[11px] font-black font-mono text-red-500">{formatAmount(initialData.amountDue)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">Unable to load account details</p>
            )}
          </div>

          {/* Section 3: How to restore access (Contact Cards) */}
          <div className="space-y-3">
             <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1 mb-2">
              <span className="text-[9px] font-mono opacity-50">02</span> Restore Access
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a 
                href="https://wa.me/254704803331" 
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-full md:col-span-2 group flex items-center justify-between p-4 rounded-xl border border-border bg-card/60 hover:bg-accent hover:border-muted-foreground/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-black transition-all">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5">WhatsApp Link</p>
                    <p className="text-sm text-foreground font-black font-mono">+254 704 803 331</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
              </a>

              <div className="flex flex-col p-4 rounded-xl border border-border bg-card/60 space-y-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Assistance</p>
                  <p className="text-[13px] text-foreground font-black font-mono">+254 704 803 331</p>
                </div>
              </div>

              <div className="flex flex-col p-4 rounded-xl border border-border bg-card/60 space-y-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Support</p>
                  <p className="text-[13px] text-foreground font-black font-mono lowercase">support@vendoflow.com</p>
                </div>
              </div>
            </div>
            
             <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest pl-1">
              Support hours: Mon–Fri, 8am–6pm EAT
            </p>
          </div>

        </div>

      </div>

      {/* Footer */}
      <div className="absolute bottom-10 left-0 right-0 text-center px-6 pointer-events-none">
        <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-[0.4em]">
          &copy; 2026 VendoFlow Operations. All Rights Reserved.
        </p>
      </div>

      {/* Geometric Decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-border/10 rounded-full pointer-events-none" />
    </div>
  )
}
