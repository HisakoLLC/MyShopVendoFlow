/**
 * Clear all demo data for an account.
 * Deletes in FK-safe order: sale_line_items → sales → po_line_items → purchase_orders
 * → variant_metrics → inventory_levels → product_variants → product_styles → customers
 * → categories, seasons, suppliers.
 * Sets accounts.has_demo_data = false.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export async function clearDemoData(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Get store IDs for this account
    const { data: stores, error: storesErr } = await supabase
      .from("stores")
      .select("store_id")
      .eq("account_id", accountId)
    if (storesErr) throw new Error(storesErr.message)
    const storeIds = (stores ?? []).map((s: { store_id: string }) => s.store_id)
    if (storeIds.length === 0) {
      return { success: true, message: "No stores; nothing to clear." }
    }

    // 2. Get sale IDs for these stores
    const { data: sales, error: salesErr } = await supabase
      .from("sales")
      .select("sale_id")
      .in("store_id", storeIds)
    if (salesErr) throw new Error(salesErr.message)
    const saleIds = (sales ?? []).map((s: { sale_id: string }) => s.sale_id)

    // 3. Delete sale_line_items for those sales
    if (saleIds.length > 0) {
      const { error: lineErr } = await supabase
        .from("sale_line_items")
        .delete()
        .in("sale_id", saleIds)
      if (lineErr) throw new Error(lineErr.message)
    }

    // 4. Delete sales
    if (saleIds.length > 0) {
      const { error: delSalesErr } = await supabase.from("sales").delete().in("sale_id", saleIds)
      if (delSalesErr) throw new Error(delSalesErr.message)
    }

    // 5. Get purchase_orders for this account (via suppliers), then delete po_line_items then purchase_orders
    const { data: suppliers, error: suppErr } = await supabase
      .from("suppliers")
      .select("supplier_id")
      .eq("account_id", accountId)
    if (!suppErr && suppliers && suppliers.length > 0) {
      const supplierIds = (suppliers as { supplier_id: string }[]).map((s) => s.supplier_id)
      const { data: pos, error: poErr } = await supabase
        .from("purchase_orders")
        .select("po_id")
        .in("supplier_id", supplierIds)
      if (!poErr && pos && pos.length > 0) {
        const poIds = (pos as { po_id: string }[]).map((p) => p.po_id)
        const { error: lineErr } = await supabase
          .from("po_line_items")
          .delete()
          .in("po_id", poIds)
        if (lineErr) throw new Error(lineErr.message)
        // inventory_receipts references purchase_orders; clear or delete receipts for these POs first
        await supabase.from("inventory_receipts").delete().in("po_id", poIds)
        const { error: delPoErr } = await supabase
          .from("purchase_orders")
          .delete()
          .in("po_id", poIds)
        if (delPoErr) throw new Error(delPoErr.message)
      }
    }

    // 6. Get product_styles for account, then variants
    const { data: styles, error: stylesErr } = await supabase
      .from("product_styles")
      .select("style_id")
      .eq("account_id", accountId)
    if (stylesErr) throw new Error(stylesErr.message)
    const styleIds = (styles ?? []).map((s: { style_id: string }) => s.style_id)

    let variantIds: string[] = []
    if (styleIds.length > 0) {
      const { data: variants, error: variantsErr } = await supabase
        .from("product_variants")
        .select("variant_id")
        .in("style_id", styleIds)
      if (variantsErr) throw new Error(variantsErr.message)
      variantIds = (variants ?? []).map((v: { variant_id: string }) => v.variant_id)
    }

    // 7. Delete variant_metrics for those variants
    if (variantIds.length > 0) {
      await supabase.from("variant_metrics").delete().in("variant_id", variantIds)
      // ignore error if table doesn't exist or RLS
    }

    // 8. Delete inventory_levels for those variants
    if (variantIds.length > 0) {
      const { error: invErr } = await supabase
        .from("inventory_levels")
        .delete()
        .in("variant_id", variantIds)
      if (invErr) throw new Error(invErr.message)
    }

    // 9. Delete product_variants for those styles
    if (styleIds.length > 0) {
      const { error: pvErr } = await supabase
        .from("product_variants")
        .delete()
        .in("style_id", styleIds)
      if (pvErr) throw new Error(pvErr.message)
    }

    // 10. Delete product_styles
    if (styleIds.length > 0) {
      const { error: psErr } = await supabase
        .from("product_styles")
        .delete()
        .eq("account_id", accountId)
      if (psErr) throw new Error(psErr.message)
    }

    // 11. Delete customers
    const { error: custErr } = await supabase.from("customers").delete().eq("account_id", accountId)
    if (custErr) throw new Error(custErr.message)

    // 12. Delete categories, seasons, suppliers (account-scoped)
    await supabase.from("categories").delete().eq("account_id", accountId)
    await supabase.from("seasons").delete().eq("account_id", accountId)
    await supabase.from("suppliers").delete().eq("account_id", accountId)

    // 13. Clear has_demo_data on account
    try {
      await (supabase as any)
        .from("accounts")
        .update({ has_demo_data: false })
        .eq("account_id", accountId)
    } catch {
      // Column may not exist
    }

    return { success: true, message: "All demo data has been removed." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear demo data"
    console.error("clearDemoData error:", error)
    throw new Error(message)
  }
}
