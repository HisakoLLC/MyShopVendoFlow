"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BusinessProfileTab } from "./business-profile-tab"
import { TaxSettingsTab } from "./tax-settings-tab"
import { ReceiptCustomizationTab } from "./receipt-customization-tab"
import { AccountBillingTab } from "./account-billing-tab"
import { StoreLimitIndicator } from "@/components/settings/StoreLimitIndicator"

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

type Store = {
  store_id: string
  name: string
  tax_rate: number | null
  address?: string | null
  phone?: string | null
  logo_url?: string | null
  logo_on_receipt?: boolean | null
}

type BusinessSettings = {
  logo_url: string | null
  business_address: string | null
  business_phone: string | null
  tax_id: string | null
  logo_on_receipt: boolean | null
  receipt_header: string | null
  receipt_footer: string | null
  return_policy: string | null
  currency: string | null
  tax_inclusive: boolean | null
}

type SettingsTabsProps = {
  account: Account
  stores: Store[]
  businessSettings: BusinessSettings | null
}

export function SettingsTabs({ account, stores, businessSettings }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = React.useState("profile")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="flex h-auto w-full justify-start rounded-none border-b border-zinc-800 bg-transparent p-0 mb-6">
        <TabsTrigger
          value="profile"
          className="rounded-none border-b-2 border-transparent px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-500 transition-all data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 dark:data-[state=active]:text-zinc-100 hover:text-zinc-300"
        >
          Business Profile
        </TabsTrigger>
        <TabsTrigger
          value="tax"
          className="rounded-none border-b-2 border-transparent px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-500 transition-all data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 dark:data-[state=active]:text-zinc-100 hover:text-zinc-300"
        >
          Tax Settings
        </TabsTrigger>
        <TabsTrigger
          value="stores"
          className="rounded-none border-b-2 border-transparent px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-500 transition-all data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 dark:data-[state=active]:text-zinc-100 hover:text-zinc-300"
        >
          Stores
        </TabsTrigger>
        <TabsTrigger
          value="receipt"
          className="rounded-none border-b-2 border-transparent px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-500 transition-all data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 dark:data-[state=active]:text-zinc-100 hover:text-zinc-300"
        >
          Receipt
        </TabsTrigger>
        <TabsTrigger
          value="billing"
          className="rounded-none border-b-2 border-transparent px-5 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-500 transition-all data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 dark:data-[state=active]:text-zinc-100 hover:text-zinc-300"
        >
          Account & Billing
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <BusinessProfileTab account={account} businessSettings={businessSettings} />
      </TabsContent>

      <TabsContent value="tax" className="mt-6">
        <TaxSettingsTab stores={stores} planTier={account.plan_tier || "starter"} />
      </TabsContent>

      <TabsContent value="stores" className="mt-6 space-y-4">
        <StoreLimitIndicator planTier={account.plan_tier} stores={stores} />
      </TabsContent>

      <TabsContent value="receipt" className="mt-6">
        <ReceiptCustomizationTab
          businessSettings={businessSettings}
          businessName={account.business_name}
        />
      </TabsContent>

      <TabsContent value="billing" className="mt-6">
        <AccountBillingTab account={account} />
      </TabsContent>
    </Tabs>
  )
}
