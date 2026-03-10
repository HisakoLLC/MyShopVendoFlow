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
      console.warn("[api][inventory][variants-with-stock] account not found", { userId: user!.id })
      return NextResponse.json({ error: "Account not found" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim() ?? ""

    if (search.length < 2) {
      return NextResponse.json({ variants: [] })
    }

    // product_variants with product_styles, filter by account, search on name/size/color/sku
    const term = `%${search}%`
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select(
        `
        variant_id,
        size,
        color,
        sku,
        product_styles!inner(
          name,
          account_id,
          archived
        )
      `
      )
      .eq("product_styles.account_id", accountId)
      .or(`product_styles.name.ilike.${term},size.ilike.${term},color.ilike.${term},sku.ilike.${term}`)
      .limit(20)

    if (variantsError) {
      return NextResponse.json({ error: variantsError.message }, { status: 500 })
    }

    const rawRows = (variants || []) as Array<{
      variant_id: string
      size: string
      color: string
      sku: string
      product_styles: { name: string; account_id: string; archived?: boolean | null } | null
    }>
    const variantRows = rawRows.filter((v) => v.product_styles?.archived !== true)

    if (variantRows.length === 0) {
      return NextResponse.json({ variants: [] })
    }

    const variantIds = variantRows.map((v) => v.variant_id)

    // inventory_levels + stores for these variants
    const { data: levels, error: levelsError } = await supabase
      .from("inventory_levels")
      .select("variant_id, store_id, quantity_on_hand, stores!inner(store_id, name)")
      .in("variant_id", variantIds)

    if (levelsError) {
      return NextResponse.json({ error: levelsError.message }, { status: 500 })
    }

    const levelRows = (levels || []) as Array<{
      variant_id: string
      store_id: string
      quantity_on_hand: number | null
      stores: { store_id: string; name: string } | null
    }>

    const inventoryByVariant = new Map<
      string,
      Array<{ store_id: string; store_name: string; quantity: number }>
    >()
    for (const row of levelRows) {
      const qty = row.quantity_on_hand ?? 0
      if (qty <= 0) continue
      const storeName = row.stores?.name ?? "Unknown"
      const storeId = row.store_id
      const list = inventoryByVariant.get(row.variant_id) ?? []
      list.push({ store_id: storeId, store_name: storeName, quantity: qty })
      inventoryByVariant.set(row.variant_id, list)
    }

    const result = variantRows.map((v) => {
      const styleName = v.product_styles?.name ?? ""
      return {
        variant_id: v.variant_id,
        style_name: styleName,
        size: v.size,
        color: v.color,
        sku: v.sku,
        inventory_by_store: inventoryByVariant.get(v.variant_id) ?? [],
      }
    })

    return NextResponse.json({ variants: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to search variants"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
