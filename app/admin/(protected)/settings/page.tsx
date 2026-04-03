import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import SettingsClient from "./_components/SettingsClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function SettingsData() {
  const { data: rawSettings } = await supabaseAdmin
    .schema(ADMIN_SCHEMA as any)
    .from("settings")
    .select("*")

  const settings = (rawSettings || []).reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value
    return acc
  }, {})

  return (
    <SettingsClient 
      initialSettings={settings} 
      whatsappPhoneId={process.env.WHATSAPP_PHONE_NUMBER_ID || ""}
    />
  )
}

export default function SettingsPage() {
  return (
    <div className="px-8 py-12 md:px-12">
      <Suspense fallback={<div className="text-white p-8 animate-pulse text-[10px] uppercase font-black tracking-widest">Fetching System Configs...</div>}>
        <SettingsData />
      </Suspense>
    </div>
  )
}
