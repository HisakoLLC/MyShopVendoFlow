import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import StaffClient from "./_components/StaffClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function StaffData() {
  const { data: staff, error } = await supabaseAdmin
    .schema(ADMIN_SCHEMA as any)
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return <div className="text-red-500 font-bold uppercase tracking-widest text-[10px]">Error loading staff records</div>
  }

  return <StaffClient initialStaff={staff || []} />
}

export default function StaffPage() {
  return (
    <div className="px-8 py-8 md:px-12 md:py-12 max-w-7xl mx-auto">
      <Suspense fallback={<div className="text-white animate-pulse text-[10px] uppercase font-black tracking-widest">Hydrating Staff Ledger...</div>}>
        <StaffData />
      </Suspense>
    </div>
  )
}
