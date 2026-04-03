import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireAdmin, adminDb } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

// GET /api/admin/accounts/[accountId]/activity?limit=50&offset=0
export async function GET(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    const { accountId } = await params
    const url    = new URL(req.url)
    const limit  = Math.min(parseInt(url.searchParams.get("limit")  ?? "50", 10), 200)
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10)

    // ── Fetch all four sources in parallel ────────────────────────────────────
    const [
      subEventsRes,
      activityLogRes,
      paymentsRes,
      invoicesRes,
    ] = await Promise.all([
      // 1. public.subscription_events
      supabaseAdmin
        .from("subscription_events")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(200),

      // 2. admin.activity_log WHERE entity_id = accountId
      (adminDb().from("activity_log") as any)
        .select("*")
        .eq("entity_id", accountId)
        .order("created_at", { ascending: false })
        .limit(200),

      // 3. admin.payments
      (adminDb().from("payments") as any)
        .select("*")
        .eq("account_id", accountId)
        .order("payment_date", { ascending: false })
        .limit(200),

      // 4. admin.invoices
      (adminDb().from("invoices") as any)
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(200),
    ])

    // ── Normalise + tag each source ───────────────────────────────────────────
    const tagged: Array<{ type: string; timestamp: string; data: unknown }> = [
      ...(subEventsRes.data ?? []).map((row: any) => ({
        type:      "billing",
        timestamp: row.created_at ?? row.event_date ?? "",
        data:      row,
      })),
      ...(activityLogRes.data ?? []).map((row: any) => ({
        type:      "admin_action",
        timestamp: row.created_at ?? "",
        data:      row,
      })),
      ...(paymentsRes.data ?? []).map((row: any) => ({
        type:      "payment",
        timestamp: row.payment_date ?? row.created_at ?? "",
        data:      row,
      })),
      ...(invoicesRes.data ?? []).map((row: any) => ({
        type:      "invoice",
        timestamp: row.created_at ?? row.due_date ?? "",
        data:      row,
      })),
    ]

    // ── Sort by timestamp DESC ────────────────────────────────────────────────
    tagged.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tb - ta
    })

    const total   = tagged.length
    const page    = tagged.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return NextResponse.json({ events: page, total, hasMore })
  } catch (err: any) {
    console.error("[activity] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
