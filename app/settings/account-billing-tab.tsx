"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CreditCard, AlertTriangle, Trash2, Store } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { requestAccountDeletion } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Toaster } from "sonner"
import { Badge } from "@/components/ui/badge"

type Account = {
  account_id: string
  business_name: string
  owner_email: string
  plan_tier: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  dodo_customer_id: string | null
  dodo_subscription_id: string | null
  next_payment_date: string | null
  last_payment_date: string | null
  last_payment_amount: number | null
}

type AccountBillingTabProps = {
  account: Account
}

const planNames: Record<string, string> = {
  starter: "Starter",
  core: "Core",
  scale: "Scale",
}

const planStoreCopy: Record<string, string> = {
  starter: "1 store included",
  core: "Up to 3 stores included",
  scale: "Up to 10 stores included",
}

const plans = {
  starter: {
    name: "Starter",
    price: 10200,
    features: ["1 store included", "Core POS features", "Basic reporting"],
  },
  core: {
    name: "Core",
    price: 16500,
    features: ["Up to 3 stores", "Advanced reporting", "Multi-store dashboard"],
  },
  scale: {
    name: "Scale",
    price: 35000,
    features: ["Up to 10 stores", "Priority support", "Multi-store analytics"],
  },
} as const

const planPriority: Record<string, number> = { starter: 1, core: 2, scale: 3 }

export function AccountBillingTab({ account }: AccountBillingTabProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  const isPaid = account.subscription_status === "active"
  const planName = planNames[account.plan_tier || "starter"] || "Starter"
  const currentPlan =
    account.plan_tier && plans[account.plan_tier as keyof typeof plans]
      ? plans[account.plan_tier as keyof typeof plans]
      : null

  const handleUpgrade = async (planTier: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch("/api/subscriptions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier }),
      })

      const data = await response.json()

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        toast.error(
          "Failed to create checkout: " + (data.error || "Unknown error")
        )
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Checkout error:", error)
      toast.error("Failed to create checkout session")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManageSubscription = async () => {
    // Open Dodo Customer Portal for payment method & subscription management
    setIsProcessing(true)
    try {
      const response = await fetch("/api/subscriptions/customer-portal", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success && data.portalUrl) {
        window.location.href = data.portalUrl
      } else {
        toast.error(
          "Failed to open customer portal: " + (data.error || "Unknown error")
        )
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Portal error:", error)
      toast.error("Failed to open customer portal")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleChangePlan = async (newPlanTier: string) => {
    const current = account.plan_tier
    const confirmMessage = current
      ? `Change from ${planNames[current] || current} to ${planNames[newPlanTier] || newPlanTier}?`
      : `Subscribe to ${planNames[newPlanTier] || newPlanTier} plan?`

    if (!window.confirm(confirmMessage)) return

    setIsProcessing(true)
    try {
      const response = await fetch("/api/subscriptions/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlanTier }),
      })
      const data = await response.json()

      if (data.success) {
        if (data.requiresCheckout && data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        } else {
          toast.success("Plan changed successfully.")
          router.refresh()
        }
      } else {
        toast.error("Failed to change plan: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Plan change error:", error)
      toast.error("Failed to change plan")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelSubscription = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to cancel subscription.")
      } else {
        toast.success("Subscription cancellation requested.")
        setShowCancelDialog(false)
        router.refresh()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel subscription.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm.')
      return
    }

    setIsProcessing(true)
    try {
      const result = await requestAccountDeletion()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setShowDeleteDialog(false)
      setDeleteConfirmText("")
      await supabase.auth.signOut()
      router.push("/login?deleted=1")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="space-y-6">
        {/* Info: account deletion is available */}
        <div className="rounded-lg border border-blue-400/20 bg-blue-400/10 px-4 py-3 flex items-start gap-3">
          <p className="text-sm text-blue-400">
            Account deletion is available in the Danger Zone below. Your data is retained for 90 days; you can request a copy before then.
          </p>
        </div>

        {/* Account Info */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-sans text-xl font-bold tracking-tight text-foreground mb-1">
            Account Information
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Your account details and current subscription plan.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
                Account ID
              </p>
              <p className="font-mono text-sm text-foreground">{account.account_id}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
                Owner Email
              </p>
              <p className="text-sm font-semibold text-foreground">{account.owner_email}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
                Active Plan
              </p>
              <p className="text-sm font-semibold text-foreground">{planName.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
                Store Limit
              </p>
              <p className="text-sm font-semibold text-foreground">{planStoreCopy[account.plan_tier || "starter"]}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
                Status
              </p>
              <div className="mt-1">
                <span className={`rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 border ${
                  account.subscription_status === 'active' || account.subscription_status === 'trial'
                    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {account.subscription_status === 'trial' ? 'ACTIVE' : (account.subscription_status?.toUpperCase() || 'UNKNOWN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-sans text-xl font-bold tracking-tight text-foreground mb-1">
            Billing & Payment
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Manage your subscription cycle and payment methods.
          </p>

          <div className="space-y-0 divide-y divide-border border-t border-border mb-6">
            <div className="py-4">
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
                Payment Method
              </p>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>Managed by Dodo Payments securely.</span>
              </div>
            </div>
            <div className="py-4">
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
                Next Billing Date
              </p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {account.next_payment_date
                  ? new Date(account.next_payment_date).toLocaleDateString("en-KE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Automatic renewal not yet active."}
              </p>
            </div>
          </div>

          <Button 
            onClick={handleManageSubscription} 
            disabled={isProcessing}
            className="border border-border text-foreground hover:bg-accent rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent w-full md:w-auto"
          >
            Manage Billing in Dodo Portal
          </Button>
        </div>

        {/* Plans Section */}
        <div id="plans-section" className="space-y-6 pt-8 border-t border-border">
          <div>
            <h3 className="font-sans text-xl font-bold tracking-tight text-foreground mb-1">
              {account.plan_tier ? "Change Subscription Plan" : "Choose Your Plan"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Select the tier that best fits your business needs.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(plans).map(([key, plan]) => {
              const isCurrent = key === account.plan_tier
              const isUpgrade =
                account.plan_tier &&
                planPriority[key] > planPriority[account.plan_tier || "starter"]
              return (
                <div
                  key={key}
                  className={`relative flex flex-col justify-between rounded-lg border p-6 transition-all ${
                    isCurrent 
                      ? "border-[#E8400C] bg-card shadow-[0_0_20px_rgba(232,64,12,0.08)]" 
                      : "border-border bg-card/50 opacity-80 hover:opacity-100 hover:border-foreground/30"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8400C] text-white text-[0.6rem] font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full">
                      Current
                    </div>
                  )}
                  <div>
                    <h4 className="font-sans text-xl font-bold tracking-tight text-foreground">{plan.name}</h4>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-bold text-foreground">KES {plan.price.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-widest">/mo</span>
                    </div>
                    <ul className="mt-8 space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                          <span className="text-foreground">/</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    onClick={() => handleChangePlan(key)}
                    disabled={isProcessing || isCurrent}
                    className={`mt-10 w-full rounded-md h-9 text-[0.65rem] font-semibold tracking-[0.12em] uppercase transition-all border-none ${
                      isCurrent
                        ? "bg-muted text-muted-foreground cursor-default"
                        : isUpgrade
                          ? "bg-[#E8400C] text-white hover:bg-[#c73508]"
                          : "border border-border text-foreground hover:bg-accent bg-transparent"
                    }`}
                  >
                    {isCurrent
                      ? "CURRENT PLAN"
                      : isUpgrade
                        ? "UPGRADE NOW"
                        : "SWITCH PLAN"}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Danger Zone */}
        {/* Danger Zone */}
        <div className="rounded-lg border border-red-900/50 bg-red-950/10 p-6">
          <h3 className="text-lg font-bold text-red-400 mb-1">Danger Zone</h3>
          <p className="text-sm text-red-400/80 mb-6">
            Actions that cannot be undone. Please proceed with extreme caution.
          </p>

          <div className="space-y-0 divide-y divide-red-900/30 border-t border-red-900/30">
            <div className="flex items-center justify-between py-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Cancel Subscription</p>
                <p className="text-xs text-muted-foreground mt-1">Immediately stop your active billing cycle.</p>
              </div>
              <Button
                onClick={() => setShowCancelDialog(true)}
                disabled={!isPaid || isProcessing}
                className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase"
              >
                Cancel Plan
              </Button>
            </div>

            <div className="flex items-center justify-between py-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-1">Permanently remove all your store data and files.</p>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isProcessing}
                className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-background border border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans text-xl font-bold tracking-tight text-foreground">Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-4">
              Are you sure you want to cancel your subscription? You'll continue to have access
              until the end of your current billing period, after which you'll lose access to all
              premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="border border-border text-foreground hover:bg-accent rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent">
              KEEP MY PLAN
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase"
            >
              {isProcessing ? "PROCESSING..." : "CONFIRM CANCELLATION"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-background border border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans text-xl font-bold tracking-tight text-destructive">
              Permanent Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-4">
              <div className="space-y-4">
                <p>
                  Your account will be marked for deletion and you will be signed out immediately.
                  All account data (stores, products, sales, etc.) is retained for 90 days, then
                  permanently removed.
                </p>
                <p className="font-semibold text-foreground uppercase tracking-tighter">This action is irreversible.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-6 space-y-2">
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
              Type DELETE to confirm
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 w-full focus:ring-1 focus:ring-[#E8400C]"
            />
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              onClick={() => setDeleteConfirmText("")}
              className="border border-border text-foreground hover:bg-accent rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent"
            >
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isProcessing || deleteConfirmText !== "DELETE"}
              className="bg-red-600 text-white hover:bg-red-700 rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase border-none"
            >
              {isProcessing ? "DELETING..." : "DELETE EVERYTHING"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
