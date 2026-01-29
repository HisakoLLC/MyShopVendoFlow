import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { PrintPOClient } from "./print-po-client"

export const dynamic = "force-dynamic"

type POLineItem = {
  line_item_id: string
  quantity_ordered: number
  quantity_received: number | null
  unit_cost: number
  line_total: number
  product_variants: {
    size: string
    color: string
    sku: string
    product_styles: { name: string } | null
  } | null
}

type PurchaseOrder = {
  po_number: string
  order_date: string | null
  expected_delivery_date: string | null
  status: string | null
  total_cost: number | null
  suppliers: { name: string; email?: string | null; phone?: string | null } | null
}

async function fetchPOForPrint(poId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) redirect("/login")

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) redirect("/onboarding")

  const { data: bs } = await supabase.from("business_settings").select("currency").eq("account_id", accountId).single()
  const currency = (bs as { currency?: string } | null)?.currency ?? "KES"

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select(
      `
      po_number,
      order_date,
      expected_delivery_date,
      status,
      total_cost,
      suppliers!inner(name, email, phone, account_id)
    `
    )
    .eq("po_id", poId)
    .eq("suppliers.account_id", accountId)
    .single()

  if (poError || !po) throw new Error("Purchase order not found or access denied.")

  const { data: lineItems, error: lineError } = await supabase
    .from("po_line_items")
    .select(
      `
      line_item_id,
      quantity_ordered,
      quantity_received,
      unit_cost,
      line_total,
      product_variants(size, color, sku, product_styles(name, account_id))
    `
    )
    .eq("po_id", poId)
    .eq("product_variants.product_styles.account_id", accountId)
    .order("line_item_id")

  if (lineError) throw new Error(lineError.message)

  return {
    po: po as PurchaseOrder,
    lineItems: (lineItems || []) as POLineItem[],
    currency,
  }
}

export default async function PrintPOPage({
  params,
}: {
  params: Promise<{ po_id: string }>
}) {
  const { po_id } = await params
  let data: { po: PurchaseOrder; lineItems: POLineItem[]; currency: string }
  try {
    data = await fetchPOForPrint(po_id)
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Purchase order not found or access denied.</p>
      </div>
    )
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .print-only { display: block !important; }
            }
            @media screen {
              .print-only { display: none; }
            }
          `,
        }}
      />
      <PrintPOClient
        poId={po_id}
        po={data.po}
        lineItems={data.lineItems}
        currency={data.currency}
      />
    </>
  )
}
