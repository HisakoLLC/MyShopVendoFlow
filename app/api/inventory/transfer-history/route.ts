import { NextRequest, NextResponse } from "next/server"
import { requireAccountAccess, requireAuth } from "@/lib/api/auth-helper"

function normalizeAccountId(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === "string") return raw.trim() || null
  if (Array.isArray(raw)) {
    const first = raw[0]
    return typeof first === "string" ? first.trim() || null : first != null ? String(first).trim() || null : null
  }
  if (typeof raw === "object" && raw !== null && "account_id" in raw) {
    const v = (raw as { account_id: unknown }).account_id
    return typeof v === "string" ? v.trim() || null : v != null ? String(v).trim() || null : null
  }
  return String(raw).trim() || null
}

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { accountId: accountIdRaw, error: accountError } = await requireAccountAccess(supabase, user!.id)
    if (accountError) return accountError

    const accountId = normalizeAccountId(accountIdRaw)
    if (!accountId) {
      console.warn("[api][inventory][transfer-history] account not found", { userId: user!.id })
      return NextResponse.json({ error: "Account not found" }, { status: 403 })
    }

    const { data: accountStores } = await supabase
      .from("stores")
      .select("store_id")
      .eq("account_id", accountId)
    const storeIds = (accountStores || []).map((s: { store_id: string }) => s.store_id)
    if (storeIds.length === 0) {
      return NextResponse.json({ transfers: [] })
    }

    const { data: transfers, error: transfersError } = await supabase
      .from("inventory_transfers")
      .select(
        `
        transfer_id,
        created_date,
        from_store_id,
        to_store_id,
        variant_id,
        quantity,
        status,
        created_by,
        product_variants(
          size,
          color,
          product_styles(name)
        )
      `
      )
      .in("from_store_id", storeIds)
      .in("to_store_id", storeIds)
      .order("created_date", { ascending: false })
      .limit(50)

    if (transfersError) {
      const msg = transfersError.message || ""
      if (msg.toLowerCase().includes("permission denied")) {
        return NextResponse.json({
          transfers: [],
          error:
            "Inventory transfers history is not yet accessible. In Supabase SQL Editor, run sql/FIX_INVENTORY_AND_SETTINGS_ACCESS.sql from this repo for your project, then redeploy.",
        })
      }
      return NextResponse.json({ error: transfersError.message }, { status: 500 })
    }

    const rows = (transfers || []) as Array<{
      transfer_id: string
      created_date: string | null
      from_store_id: string | null
      to_store_id: string | null
      variant_id: string | null
      quantity: number
      status: string | null
      created_by: string | null
      product_variants: {
        size: string
        color: string
        product_styles: { name: string } | null
      } | null
    }>

    const createdByIds = new Set<string>()
    for (const r of rows) {
      if (r.created_by) createdByIds.add(r.created_by)
    }
    const { data: fromStores } = await supabase
      .from("stores")
      .select("store_id, name")
      .in("store_id", rows.map((r) => r.from_store_id).filter(Boolean) as string[])
      .eq("account_id", accountId)

    const { data: toStores } = await supabase
      .from("stores")
      .select("store_id, name")
      .in("store_id", rows.map((r) => r.to_store_id).filter(Boolean) as string[])
      .eq("account_id", accountId)

    const storeNames = new Map<string, string>()
    for (const s of (fromStores || []) as Array<{ store_id: string; name: string }>) {
      storeNames.set(s.store_id, s.name)
    }
    for (const s of (toStores || []) as Array<{ store_id: string; name: string }>) {
      storeNames.set(s.store_id, s.name)
    }

    // Resolve created_by names: staff.auth_user_id = created_by (schema stores auth uid)
    const createdByNameMap = new Map<string, string>()
    if (createdByIds.size > 0) {
      const { data: staffRows } = await supabase
        .from("staff")
        .select("auth_user_id, first_name, last_name")
        .in("auth_user_id", Array.from(createdByIds))
      for (const s of (staffRows || []) as Array<{
        auth_user_id: string
        first_name: string | null
        last_name: string | null
      }>) {
        const name = [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || "Staff"
        createdByNameMap.set(s.auth_user_id, name)
      }
    }

    const result = rows
      .filter((r) => r.from_store_id && r.to_store_id && (storeNames.has(r.from_store_id) || storeNames.has(r.to_store_id)))
      .map((r) => {
        const style = r.product_variants?.product_styles
        const productName = style?.name ?? "Unknown"
        const variantDetails = r.product_variants
          ? `${r.product_variants.size}, ${r.product_variants.color}`
          : "—"
        const fromName = r.from_store_id ? storeNames.get(r.from_store_id) ?? "—" : "—"
        const toName = r.to_store_id ? storeNames.get(r.to_store_id) ?? "—" : "—"
        const creatorName = r.created_by
          ? createdByNameMap.get(r.created_by) ?? "Account Owner"
          : "—"

        return {
          transfer_id: r.transfer_id,
          created_at: r.created_date ?? "",
          product_name: productName,
          variant_details: variantDetails,
          from_store_name: fromName,
          to_store_name: toName,
          quantity: r.quantity,
          status: r.status ?? "pending",
          created_by_name: creatorName,
        }
      })

    return NextResponse.json({ transfers: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load transfer history"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
