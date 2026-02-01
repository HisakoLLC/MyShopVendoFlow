import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRightLeft } from "lucide-react"

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

  const { data: accountIdRaw } = await supabase.rpc("get_account_id")
  const aid =
    Array.isArray(accountIdRaw) ? accountIdRaw[0]
    : accountIdRaw != null && typeof accountIdRaw === "object" && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (!aid) {
    redirect("/onboarding?redirect=/inventory/transfer")
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <ArrowRightLeft className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Transfer between stores</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This feature will let you control inventory across different stores in one portal. It will be available in a dedicated portal soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
