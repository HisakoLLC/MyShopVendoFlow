import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransferInventoryForm } from "./transfer-inventory-form"
import { TransferHistoryClient } from "./TransferHistoryClient"

export const dynamic = "force-dynamic"

export default async function TransferInventoryPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  // Resolve account and basic role; middleware already enforces path access
  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError) {
    redirect("/onboarding?redirect=/inventory/transfer")
  }
  const aid =
    Array.isArray(accountIdRaw) ? accountIdRaw[0]
    : accountIdRaw != null && typeof accountIdRaw === "object" && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (!aid) {
    redirect("/onboarding?redirect=/inventory/transfer")
  }

  // Only owners/managers should access; cashiers get redirected in middleware,
  // but we add a defensive check here as well.
  const { data: staffRow } = await supabase
    .from("staff")
    .select("role, active")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  if (staffRow && staffRow.active !== false && staffRow.role === "cashier") {
    redirect("/pos")
  }

  const { data: stores } = await supabase
    .from("stores")
    .select("store_id,name")
    .eq("account_id", aid)
    .order("name", { ascending: true })

  const safeStores =
    (stores || []).map((s: { store_id: string; name: string }) => ({
      store_id: s.store_id,
      name: s.name,
    })) ?? []

  return (
    <div className="min-h-screen bg-background text-foreground px-8 py-8">
      <Link 
        href="/inventory" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to inventory
      </Link>

      <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            MOVE STOCK BETWEEN STORES WHEN ONE LOCATION IS LOW AND ANOTHER HAS EXCESS
          </p>
          <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight text-foreground">
            Inventory Transfer
          </h1>
        </div>
      </div>

      <div className="grid gap-8">
        <TransferInventoryForm stores={safeStores} />
      </div>

      <div className="mt-12 space-y-6">
        <div>
          <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground mb-1">
            Recent Transfers
          </h2>
          <p className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase text-muted-foreground">
            LAST 50 TRANSFERS FOR THIS ACCOUNT
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <TransferHistoryClient />
        </div>
      </div>
    </div>
  )
}
