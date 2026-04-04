import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"
import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: merchantId } = params

    const { data, error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("reports")
      .select("id, report_type, created_at, status")
      .eq("account_id", merchantId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(3)

    if (error) throw error

    return NextResponse.json({ reports: data })
  } catch (err: any) {
    console.error("[recent-reports] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
