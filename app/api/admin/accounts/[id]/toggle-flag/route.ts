import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"
import { adminDb } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id: accountId } = await params
    const { flag, enabled } = await req.json()

    if (!['vip', 'at_risk'].includes(flag)) {
      return NextResponse.json({ error: "Invalid flag type" }, { status: 400 })
    }

    // Upsert into admin.account_flags
    const { error } = await (adminDb().from("account_flags") as any)
      .upsert({
        account_id: accountId,
        [flag === 'vip' ? 'is_vip' : 'is_at_risk']: enabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'account_id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[toggle-flag] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
