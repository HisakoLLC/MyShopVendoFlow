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
  stripe_customer_id: string | null
}

type Store = {
  store_id: string
  name: string
  tax_rate: number | null
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
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="profile">Business Profile</TabsTrigger>
        <TabsTrigger value="tax">Tax Settings</TabsTrigger>
        <TabsTrigger value="stores">Stores</TabsTrigger>
        <TabsTrigger value="receipt">Receipt</TabsTrigger>
        <TabsTrigger value="billing">Account & Billing</TabsTrigger>
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
