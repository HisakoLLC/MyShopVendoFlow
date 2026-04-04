import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser || adminUser.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: accountId } = await params

    // Get owner email
    const { data: account, error: accErr } = await supabaseAdmin
      .from("accounts")
      .select("owner_email")
      .eq("account_id", accountId)
      .single()

    if (accErr || !account?.owner_email) throw accErr || new Error("Owner email not found")

    // Trigger Supabase Auth Reset
    const { error: resetErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: account.owner_email,
    })

    if (resetErr) throw resetErr

    // Alternatively, just send the recovery email:
    // const { error } = await supabaseAdmin.auth.resetPasswordForEmail(account.owner_email)

    return NextResponse.json({ success: true, email: account.owner_email })
  } catch (err: any) {
    console.error("[reset-password] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
