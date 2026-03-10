import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

type BulkSetRequest = {
  updates: {
    variant_id: string
    store_id: string
    quantity: number
  }[]
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 })
    }

    const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
    if (accountIdError || !accountIdRaw) {
      return NextResponse.json({ error: "Unable to resolve account." }, { status: 400 })
    }
    const accountId = Array.isArray(accountIdRaw) ? accountIdRaw[0] ?? null : accountIdRaw
    if (accountId == null || accountId === "") {
      return NextResponse.json({ error: "Unable to resolve account." }, { status: 400 })
    }

    const body = (await req.json()) as BulkSetRequest
    const updates = body?.updates ?? []

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: true, updated: 0 }, { status: 200 })
    }

    // Basic validation: non-negative integers
    for (const u of updates) {
      if (!u.variant_id || !u.store_id || typeof u.quantity !== "number") {
        return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
      }
      if (!Number.isInteger(u.quantity) || u.quantity < 0) {
        return NextResponse.json(
          { error: "Quantities must be whole numbers and not negative." },
          { status: 400 }
        )
      }
    }

    const variantIds = Array.from(new Set(updates.map((u) => u.variant_id)))
    const storeIds = Array.from(new Set(updates.map((u) => u.store_id)))

    // Validate variants belong to account
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("variant_id, product_styles!inner(account_id)")
      .in("variant_id", variantIds)

    if (variantsError) {
      return NextResponse.json({ error: variantsError.message }, { status: 400 })
    }

    const invalidVariant = (variants ?? []).some(
      (v: { product_styles: { account_id: string } | null }) => {
        const style = v.product_styles as { account_id: string } | null
        return !style || style.account_id !== accountId
      }
    )

    if (invalidVariant || (variants ?? []).length !== variantIds.length) {
      return NextResponse.json({ error: "Invalid variants for this account." }, { status: 403 })
    }

    // Validate stores belong to account
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("store_id, account_id")
      .in("store_id", storeIds)

    if (storesError) {
      return NextResponse.json({ error: storesError.message }, { status: 400 })
    }

    const invalidStore =
      (stores ?? []).some((s) => s.account_id !== accountId) || (stores ?? []).length !== storeIds.length

    if (invalidStore) {
      return NextResponse.json({ error: "Invalid stores for this account." }, { status: 403 })
    }

    // Fetch existing inventory levels for all variant × store pairs
    const { data: existingLevels, error: levelsError } = await supabase
      .from("inventory_levels")
      .select("inventory_id, variant_id, store_id")
      .in("variant_id", variantIds)
      .in("store_id", storeIds)

    if (levelsError) {
      return NextResponse.json({ error: levelsError.message }, { status: 400 })
    }

    type LevelKey = string
    const levelByKey = new Map<
      LevelKey,
      {
        inventory_id: string
      }
    >(
      (existingLevels ?? []).map(
        (l: { inventory_id: string; variant_id: string; store_id: string }) => [
          `${l.variant_id}:${l.store_id}`,
          { inventory_id: l.inventory_id },
        ]
      )
    )

    const nowIso = new Date().toISOString()

    const updatesToExisting: {
      inventory_id: string
      quantity_on_hand: number
      last_counted_date: string
    }[] = []
    const inserts: {
      variant_id: string
      store_id: string
      quantity_on_hand: number
      quantity_reserved: number
      last_counted_date: string
    }[] = []

    for (const u of updates) {
      const key: LevelKey = `${u.variant_id}:${u.store_id}`
      const existing = levelByKey.get(key)
      if (existing) {
        updatesToExisting.push({
          inventory_id: existing.inventory_id,
          quantity_on_hand: u.quantity,
          last_counted_date: nowIso,
        })
      } else {
        inserts.push({
          variant_id: u.variant_id,
          store_id: u.store_id,
          quantity_on_hand: u.quantity,
          quantity_reserved: 0,
          last_counted_date: nowIso,
        })
      }
    }

    if (updatesToExisting.length > 0) {
      const { error: updateError } = await supabase
        .from("inventory_levels")
        .upsert(
          updatesToExisting.map((u) => ({
            inventory_id: u.inventory_id,
            quantity_on_hand: u.quantity_on_hand,
            last_counted_date: u.last_counted_date,
          }))
        )

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("inventory_levels").insert(inserts)
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      {
        success: true,
        updated: updatesToExisting.length,
        inserted: inserts.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}

