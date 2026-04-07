import { supabaseAdmin } from "./supabase-admin"
import { ADMIN_SCHEMA } from "./billing-helpers"

export interface ReportData {
  summary: {
    total_revenue: number
    transaction_count: number
    units_sold: number
    avg_basket: number
    previous_revenue?: number
    previous_transactions?: number
    revenue_change_pct?: number
    transaction_change_pct?: number
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
  endDate: string,
  reportType: string = "custom"
): Promise<ReportData & { pdf_url?: string }> {
    // 1. Calculate Previous Period
    const calculatePreviousPeriod = () => {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const durationMs = end.getTime() - start.getTime()
      
      let prevStart: Date
      let prevEnd: Date

      if (reportType === "daily") {
        prevStart = new Date(start)
        prevStart.setDate(start.getDate() - 1)
        prevEnd = new Date(prevStart)
      } else if (reportType === "monthly") {
        prevStart = new Date(start)
        prevStart.setMonth(start.getMonth() - 1)
        prevEnd = new Date(start)
        prevEnd.setDate(0) // Last day of prev month
      } else {
        // Weekly or Custom: Move back by duration + 1 day
        prevStart = new Date(start.getTime() - (durationMs + 86400000))
        prevEnd = new Date(start.getTime() - 86400000)
      }

      return {
        start: prevStart.toISOString().split('T')[0],
        end: prevEnd.toISOString().split('T')[0]
      }
    }

    const prevPeriod = calculatePreviousPeriod()

    // 2. Fetch Helper: Aggregate Stats
    const getStats = async (start: string, end: string) => {
      const { data, error } = await supabaseAdmin
        .schema("public")
        .from("sales")
        .select(`
          sale_id,
          grand_total,
          payment_method,
          store_id,
          sale_line_items (
            quantity,
            line_total,
            product_variants (
              product_styles ( name )
            )
          ),
          stores!inner (
            store_id,
            name,
            account_id
          )
        `)
        .eq("stores.account_id", merchantId)
        .eq("status", "completed")
        .gte("sale_date", start)
        .lte("sale_date", end)

      if (error) throw error
      return (data as any[]) || []
    }

    const currentSales = await getStats(startDate, endDate)
    const previousSales = await getStats(prevPeriod.start, prevPeriod.end)

    // 3. Process Aggregates
    let totalRevenue = 0
    let totalUnits = 0
    const storeRevenue: Record<string, { id: string, name: string, revenue: number, count: number }> = {}
    const paymentMethods: Record<string, number> = { mpesa: 0, card: 0, cash: 0 }
    const productSales: Record<string, { name: string, revenue: number, units: number }> = {}

    currentSales.forEach(sale => {
      totalRevenue += (sale.grand_total || 0)
      const method = (sale.payment_method || "cash").toLowerCase()
      paymentMethods[method] = (paymentMethods[method] || 0) + (sale.grand_total || 0)
      
      const storeName = sale.stores?.name || `Store ${sale.store_id.slice(0, 4)}`
      if (!storeRevenue[sale.store_id]) {
        storeRevenue[sale.store_id] = { id: sale.store_id, name: storeName, revenue: 0, count: 0 }
      }
      storeRevenue[sale.store_id].revenue += (sale.grand_total || 0)
      storeRevenue[sale.store_id].count += 1

      sale.sale_line_items?.forEach((item: any) => {
        const qty = Number(item.quantity || 0)
        totalUnits += qty
        const name = item.product_variants?.product_styles?.name || "Unknown Product"
        if (!productSales[name]) {
          productSales[name] = { name, revenue: 0, units: 0 }
        }
        productSales[name].revenue += (item.line_total || 0)
        productSales[name].units += qty
      })
    })

    // 4. Comparison Stats
    const prevRevenue = previousSales.reduce((sum, s) => sum + (s.grand_total || 0), 0)
    const prevTrans = previousSales.length
    
    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return 0
      return ((curr - prev) / prev) * 100
    }

    // 5. Inventory Snapshot
    const { count: totalVariants } = await supabaseAdmin
      .schema("public")
      .from("product_variants")
      .select("*", { count: "exact", head: true })

    const { count: lowStock } = await supabaseAdmin
      .schema("public")
      .from("product_variants")
      .select("*", { count: "exact", head: true })
      .lt("quantity_on_hand", 5)

    const finalData: ReportData = {
      summary: {
        total_revenue: totalRevenue,
        transaction_count: currentSales.length,
        units_sold: totalUnits,
        avg_basket: currentSales.length > 0 ? totalRevenue / currentSales.length : 0,
        previous_revenue: prevRevenue,
        previous_transactions: prevTrans,
        revenue_change_pct: calculateChange(totalRevenue, prevRevenue),
        transaction_change_pct: calculateChange(currentSales.length, prevTrans)
      },
      breakdowns: {
        stores: Object.values(storeRevenue).sort((a, b) => b.revenue - a.revenue),
        payment_methods: paymentMethods,
        top_products: Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      },
      inventory: {
        total_variants: totalVariants || 0,
        low_stock: lowStock || 0,
        dead_stock: 0
      }
    }

    // 6. Generate PDF Document
    let pdfUrl: string | undefined
    try {
      const { data: accountData } = await supabaseAdmin
        .schema("public")
        .from("accounts")
        .select("business_name")
        .eq("account_id", merchantId)
        .single()
        
      const businessName = accountData?.business_name || "Merchant"
      const { generateAndUploadReportPDF } = await import("./pdf-generator")
      
      pdfUrl = await generateAndUploadReportPDF(
        merchantId, 
        businessName, 
        reportType, 
        startDate, 
        endDate, 
        finalData
      )
    } catch (pdfError) {
      console.error("PDF Generation failed:", pdfError)
    }

    return {
      ...finalData,
      pdf_url: pdfUrl
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
          templateParams: params,
          mediaUrl: report.report_data?.pdf_url,
          fileName: `Report_${report.report_type}_${new Date().getTime()}.pdf`
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
