import { jsPDF } from "jspdf"
import { supabaseAdmin } from "./supabase-admin"
import { ADMIN_SCHEMA } from "./billing-helpers"
import { ReportData } from "./reports"

export const dynamic = "force-dynamic"

/**
 * Generates a styled PDF report offline and pushes it to Supabase storage.
 * Returns the public URL of the generated PDF.
 */
export async function generateAndUploadReportPDF(
  merchantId: string,
  businessName: string,
  reportType: string,
  periodStart: string,
  periodEnd: string,
  data: ReportData
): Promise<string> {
  const doc = new jsPDF({ format: "a4", unit: "mm" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // HELPERS
  const gap = (n: number) => { y += n }
  const rule = (thickness = 0.2) => {
    doc.setLineWidth(thickness)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    gap(4)
  }
  const checkPage = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 25) {
      doc.addPage()
      y = margin
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    })
  }

  const currency = "KES" // Assuming KES for VendoFlow

  // 1. BRAND HEADER
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 30, 30)
  doc.text("VENDOFLOW", margin, y)
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(120, 120, 120)
  doc.text("ADMINISTRATION INTELLIGENCE", margin, y + 5)
  gap(15)
  rule(0.5)
  gap(5)

  // 2. REPORT METADATA (2 columns)
  const col1x = margin
  const col2x = pageWidth / 2 + 5
  
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("REPORT FOR", col1x, y)
  doc.text("REPORT PERIOD", col2x, y)
  gap(5)
  
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text(businessName, col1x, y)
  
  const periodText = reportType === 'daily' 
    ? formatDate(periodStart) 
    : `${formatDate(periodStart)} — ${formatDate(periodEnd)}`
  
  doc.setFontSize(10)
  doc.text(`${reportType.toUpperCase()} SALES METRICS`, col2x, y)
  gap(5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(80, 80, 80)
  doc.text(periodText, col2x, y)
  
  gap(12)
  rule()
  gap(5)

  // 3. FINANCIAL SUMMARY BANNER
  checkPage(30)
  doc.setFillColor(248, 250, 252) // slate-50
  doc.rect(margin, y, contentWidth, 25, "F")
  
  const metricWidth = contentWidth / 3
  
  // Box 1
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("TOTAL REVENUE", margin + 5, y + 8)
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text(`${currency} ${data.summary.total_revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`, margin + 5, y + 16)

  // Box 2
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("TRANSACTIONS", margin + metricWidth + 5, y + 8)
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(data.summary.transaction_count.toString(), margin + metricWidth + 5, y + 16)

  // Box 3
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("AVERAGE BASKET", margin + (metricWidth * 2) + 5, y + 8)
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(`${currency} ${data.summary.avg_basket.toLocaleString(undefined, {minimumFractionDigits: 2})}`, margin + (metricWidth * 2) + 5, y + 16)

  gap(35)

  // 4. TOP PRODUCTS
  checkPage(40)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("HIGH-PERFORMING ASSETS", margin, y)
  gap(8)
  
  // Table Header
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text("PRODUCT NAME", margin, y)
  doc.text("UNITS SOLD", margin + 110, y)
  doc.text("REVENUE", margin + 140, y)
  gap(4)
  rule()

  // Table Body
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(40, 40, 40)
  
  if (data.breakdowns.top_products.length === 0) {
    doc.text("No product sales data available for this period.", margin, y)
    gap(8)
  } else {
    data.breakdowns.top_products.forEach(p => {
      checkPage(10)
      doc.text(p.name, margin, y, { maxWidth: 100 })
      doc.text(p.units.toString(), margin + 110, y)
      doc.text(`${currency} ${p.revenue.toLocaleString()}`, margin + 140, y)
      gap(8)
    })
  }
  gap(4)
  rule()

  // 5. STORE & PAYMENT BREAKDOWNS
  checkPage(40)
  const baseY = y
  
  // Left: Stores
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("STORE BREAKDOWN", margin, y)
  gap(6)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  
  if (data.breakdowns.stores.length === 0) {
      doc.text("No store data", margin, y)
      gap(6)
  } else {
      data.breakdowns.stores.forEach(s => {
        doc.text(s.name, margin, y)
        doc.text(`${currency} ${s.revenue.toLocaleString()}`, margin + 60, y)
        gap(6)
      })
  }

  const leftY = y
  y = baseY
  
  // Right: Payments
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("PAYMENT METHODS", margin + 90, y)
  gap(6)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  
  const payments = Object.entries(data.breakdowns.payment_methods)
  if (payments.length === 0) {
      doc.text("No payment data", margin + 90, y)
      gap(6)
  } else {
      payments.forEach(([method, amount]) => {
        doc.text(method.toUpperCase(), margin + 90, y)
        doc.text(`${currency} ${(amount as number).toLocaleString()}`, margin + 140, y)
        gap(6)
      })
  }
  
  y = Math.max(leftY, y) + 10
  rule()

  // 6. FOOTER
  const footerY = pageHeight - 15
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text("Generated securely by VendoFlow Intelligence", margin, footerY)
  doc.text(new Date().toUTCString(), pageWidth - margin, footerY, { align: "right" })

  // 7. EXPORT & UPLOAD
  const filename = `reports/${merchantId}/${reportType}-${Date.now()}.pdf`
  const buf = doc.output("arraybuffer")
  const uint8array = new Uint8Array(buf)

  // Ensure bucket exists or just upload (assumes bucket 'admin-reports' exists)
  // we will use the default 'vendo_admin' schema bucket if possible, but actually Supabase storage exists in the storage schema.
  // We'll upload to a bucket named 'admin_reports'.
  const { data: uploadData, error: uploadError } = await supabaseAdmin
    .storage
    .from("admin_reports")
    .upload(filename, uint8array, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true
    })

  if (uploadError) {
    console.error("PDF Upload Error:", uploadError)
    // Create bucket if it doesn't exist
    if (uploadError.message.includes("Bucket not found")) {
        await supabaseAdmin.storage.createBucket("admin_reports", { public: true })
        const { error: retryError } = await supabaseAdmin
            .storage
            .from("admin_reports")
            .upload(filename, uint8array, {
                contentType: "application/pdf",
                cacheControl: "3600",
                upsert: true
            })
        if (retryError) throw retryError
    } else {
        throw uploadError
    }
  }

  // Generate Public URL
  const { data: publicUrlData } = supabaseAdmin
    .storage
    .from("admin_reports")
    .getPublicUrl(filename)

  return publicUrlData.publicUrl
}
