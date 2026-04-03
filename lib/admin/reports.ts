import { supabaseAdmin } from "./supabase-admin"
import { ADMIN_SCHEMA } from "./billing-helpers"

export interface ReportData {
  summary: {
    total_revenue: number
    transaction_count: number
    avg_basket: number
  }
  breakdowns: {
    stores: Array<{ id: string, name: string, revenue: number, count: number }>
    payment_methods: Record<string, number>
    top_products: Array<{ name: string, revenue: number, units: number }>
  }
  inventory: {
    total_variants: number
    low_stock: number
    dead_stock: number
  }
}

/**
 * Aggregates sales and inventory data for a merchant over a specific period.
 * Shared between manual triggers and automated cron jobs.
 */
export async function aggregateReportData(
  merchantId: string, 
  startDate: string, 
  endDate: string
): Promise<ReportData> {
    // 1. Fetch Sales Data
    const { data: sales, error: salesError } = await supabaseAdmin
      .from("sales")
      .select(`
        sale_id,
        grand_total,
        payment_method,
        store_id,
        sale_line_items!sale_line_items_sale_id_fkey (
          quantity,
          line_total,
          variant_id,
          product_variants (
            product_styles (
              name
            )
          )
        )
      `)
      .eq("account_id", merchantId)
      .gte("sale_date", startDate)
      .lte("sale_date", endDate)

    if (salesError) throw salesError

    const salesList = (sales as any[]) || []
    
    // 2. Process Aggregates
    let totalRevenue = 0
    const storeRevenue: Record<string, { id: string, name: string, revenue: number, count: number }> = {}
    const paymentMethods: Record<string, number> = {}
    const productSales: Record<string, { name: string, revenue: number, units: number }> = {}

    salesList.forEach(sale => {
      totalRevenue += (sale.grand_total || 0)
      paymentMethods[sale.payment_method] = (paymentMethods[sale.payment_method] || 0) + (sale.grand_total || 0)
      
      if (!storeRevenue[sale.store_id]) {
        storeRevenue[sale.store_id] = { id: sale.store_id, name: `Store ${sale.store_id.slice(0, 4)}`, revenue: 0, count: 0 }
      }
      storeRevenue[sale.store_id].revenue += (sale.grand_total || 0)
      storeRevenue[sale.store_id].count += 1

      sale.sale_line_items?.forEach((item: any) => {
        const name = item.product_variants?.product_styles?.name || "Unknown Product"
        if (!productSales[name]) {
          productSales[name] = { name, revenue: 0, units: 0 }
        }
        productSales[name].revenue += (item.line_total || 0)
        productSales[name].units += (item.quantity || 0)
      })
    })

    // 3. Fetch Inventory Data (simplified snapshot)
    const { count: totalVariants } = await supabaseAdmin
      .from("product_variants")
      .select("*", { count: "exact", head: true })

    const { count: lowStock } = await supabaseAdmin
      .from("product_variants")
      .select("*", { count: "exact", head: true })
      .lt("quantity_on_hand", 5)

    return {
      summary: {
        total_revenue: totalRevenue,
        transaction_count: salesList.length,
        avg_basket: salesList.length > 0 ? totalRevenue / salesList.length : 0
      },
      breakdowns: {
        stores: Object.values(storeRevenue),
        payment_methods: paymentMethods,
        top_products: Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      },
      inventory: {
        total_variants: totalVariants || 0,
        low_stock: lowStock || 0,
        dead_stock: 0 // Placeholder
      }
    }
}

/**
 * Distributes an approved report to specific WhatsApp conversations.
 */
export async function distributeReportToConversations(
  reportId: string,
  merchantId: string,
  recipientConversationIds: string[],
  baseUrl: string,
  cookie?: string
) {
  // Fetch report for metadata
  const { data: report } = await supabaseAdmin
    .schema(ADMIN_SCHEMA as any)
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single()

  if (!report) throw new Error("Report not found")

  const results = []
  for (const conversationId of recipientConversationIds) {
    try {
      const { data: convo } = await supabaseAdmin
        .schema(ADMIN_SCHEMA as any)
        .from("whatsapp_conversations")
        .select("contact_phone, contact_name")
        .eq("id", conversationId)
        .single()

      if (!convo) throw new Error("Conversation not found")

      let templateName = ""
      let params: Record<string, string> = { name: convo.contact_name || "Merchant" }

      if (report.report_type === "daily") {
        templateName = "daily_sales_report"
        params.date = new Date(report.period_start).toLocaleDateString("en-GB")
      } else if (report.report_type === "weekly") {
        templateName = "weekly_sales_report"
        params.start_date = new Date(report.period_start).toLocaleDateString("en-GB")
        params.end_date = new Date(report.period_end).toLocaleDateString("en-GB")
      } else {
        templateName = "monthly_sales_report"
        params.month = new Date(report.period_start).toLocaleString("default", { month: "long" })
      }

      const sendRes = await fetch(`${baseUrl}/api/admin/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          type: "template",
          templateName,
          templateParams: params
        })
      })

      if (!sendRes.ok) throw new Error("Failed to send WhatsApp via API")

      await supabaseAdmin
        .schema(ADMIN_SCHEMA as any)
        .from("report_recipients")
        .insert({
          report_id: reportId,
          conversation_id: conversationId,
          status: "sent",
          sent_at: new Date().toISOString()
        })

      results.push({ conversationId, status: "success" })
    } catch (err: any) {
      results.push({ conversationId, status: "failed", error: err.message })
    }
  }

  const successCount = results.filter(r => r.status === "success").length
  if (successCount > 0) {
    await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("reports")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", reportId)
  }

  return { results, summary: `Approved report sent to ${successCount} recipients` }
}
