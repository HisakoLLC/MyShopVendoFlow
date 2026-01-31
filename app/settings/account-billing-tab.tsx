"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CreditCard, AlertTriangle, Trash2 } from "lucide-react"
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
  stripe_customer_id: string | null
}

type AccountBillingTabProps = {
  account: Account
}

const planNames: Record<string, string> = {
  starter: "Starter",
  core: "Core",
  scale: "Scale",
}

export function AccountBillingTab({ account }: AccountBillingTabProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  const isTrial = account.subscription_status === "trial" || account.trial_ends_at
  const isPaid = account.subscription_status === "active" && !isTrial
  const planName = planNames[account.plan_tier || "starter"] || "Starter"

  const handleManageSubscription = async () => {
    // TODO: Implement Stripe customer portal redirect
    toast.info("Stripe customer portal integration coming soon.")
  }

  const handleCancelSubscription = async () => {
    setIsProcessing(true)
    try {
      // TODO: Implement Stripe subscription cancellation
      toast.info("Subscription cancellation coming soon.")
      setShowCancelDialog(false)
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Account ID
                </div>
                <div className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {account.account_id}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Owner Email
                </div>
                <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {account.owner_email}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Plan</div>
                <div className="mt-1">
                  <Badge variant="default">{planName}</Badge>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Subscription Status
                </div>
                <div className="mt-1">
                  <Badge
                    variant={
                      account.subscription_status === "active"
                        ? "default"
                        : account.subscription_status === "trial"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {account.subscription_status || "Unknown"}
                  </Badge>
                </div>
              </div>
              {account.trial_ends_at && (
                <div>
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Trial Ends
                  </div>
                  <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                    {formatDate(account.trial_ends_at)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing Section */}
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your subscription and payment method</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTrial ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
                <div className="mb-3">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    You're on a trial plan
                  </div>
                  <div className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                    {account.trial_ends_at
                      ? `Trial ends on ${formatDate(account.trial_ends_at)}`
                      : "Upgrade to a paid plan to continue using all features."}
                  </div>
                </div>
                <Button>Upgrade to Paid Plan</Button>
              </div>
            ) : isPaid ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      Payment Method
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <CreditCard className="h-4 w-4" />
                      <span>Card ending in •••• (Stripe integration coming soon)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      Next Billing Date
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      — (Stripe integration coming soon)
                    </div>
                  </div>
                </div>
                <Button onClick={handleManageSubscription} variant="outline">
                  Manage Subscription
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/40 dark:bg-yellow-950/30">
                <div className="text-sm text-yellow-900 dark:text-yellow-100">
                  Subscription status: {account.subscription_status || "Unknown"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900/40">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-red-200 p-4 dark:border-red-900/40">
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  Cancel Subscription
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Cancel your subscription. You'll lose access at the end of the billing period.
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                disabled={!isPaid}
              >
                Cancel Subscription
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-red-200 p-4 dark:border-red-900/40">
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">Delete Account</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Schedule account deletion. Your data is retained for 90 days, then permanently
                  removed. You can request a copy of your data before the 90-day period.
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You'll continue to have access
              until the end of your current billing period, after which you'll lose access to all
              features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-500"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Your account will be marked for deletion and you will be signed out immediately.
                  All account data (stores, products, sales, etc.) is retained for 90 days, then
                  permanently removed.
                </p>
                <p>
                  You can request a copy of your data within 90 days by contacting support (e.g.
                  email or in-app support).
                </p>
                <p className="font-medium">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-2">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              To confirm, type <span className="font-mono">DELETE</span> below:
            </div>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-500"
              disabled={isProcessing || deleteConfirmText !== "DELETE"}
            >
              {isProcessing ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
