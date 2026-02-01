import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSupabaseUrl } from "@/lib/supabase/env"

const POS_STAFF_SHARED_EMAIL = "pos-staff@vendoflow.internal"

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user || user.email !== POS_STAFF_SHARED_EMAIL) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const staff_id = body.staff_id
    const account_id = body.account_id

    if (!staff_id || !account_id || typeof staff_id !== "string" || typeof account_id !== "string") {
      return NextResponse.json(
        { error: "staff_id and account_id are required" },
        { status: 400 }
      )
    }

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
    const supabaseUrl = getSupabaseUrl()
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("staff_id, account_id, active, role")
      .eq("staff_id", staff_id)
      .eq("account_id", account_id)
      .eq("active", true)
      .single()

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Access revoked. Contact owner." },
        { status: 403 }
      )
    }

    const role = staff.role === "owner" || staff.role === "manager" || staff.role === "cashier" ? staff.role : "cashier"
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { staff_id: staff.staff_id, account_id: staff.account_id, role },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
