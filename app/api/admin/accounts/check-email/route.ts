import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireAdmin } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

// GET /api/admin/accounts/check-email?email=x
export async function GET(req: Request) {
  try {
    const { errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    const email = new URL(req.url).searchParams.get("email")?.trim()
    if (!email) {
      return NextResponse.json({ error: "Missing email query param" }, { status: 400 })
    }

    const { data } = await supabaseAdmin
      .from("staff")
      .select("staff_id")
      .eq("email", email)
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ exists: !!data })
  } catch (err: any) {
    console.error("[check-email] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
