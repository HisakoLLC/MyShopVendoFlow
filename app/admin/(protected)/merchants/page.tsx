import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import MerchantsData from "./_components/MerchantsData"
import MerchantsLoading from "./loading"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function MerchantsPage() {
  return (
    <Suspense fallback={<MerchantsLoading />}>
      <MerchantsData />
    </Suspense>
  )
}
