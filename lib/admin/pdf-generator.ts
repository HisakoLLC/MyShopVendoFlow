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

  const formatReportPeriod = (type: string, start: Date, end: Date): string => {
    const locale = 'en-KE'
    if (type === 'daily') return start.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (type === 'weekly') return `Week of ${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
    if (type === 'monthly') return start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    return `${start.toLocaleDateString(locale)} – ${end.toLocaleDateString(locale)}`
  }

  const currency = "KES"

  // 1. BRAND HEADER
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("VENDOFLOW", margin, y)
  
  doc.setFontSize(14)
  doc.text(businessName.toUpperCase(), margin, y + 8)
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  const reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Performance Report`
  doc.text(reportTitle.toUpperCase(), margin, y + 16)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(150, 150, 150)
  doc.text(formatReportPeriod(reportType, new Date(periodStart), new Date(periodEnd)), margin, y + 21)
  
  gap(30)
  rule(0.8)
  gap(10)

  // Remove old report meta section
  gap(-5)

  // 3. KPI CARDS (2x2 Grid)
  const cardWidth = (contentWidth - 10) / 2
  const cardHeight = 35
  const padding = 6

  const renderCard = (ix: number, iy: number, label: string, value: string, change?: number, prevLabel?: string) => {
    const cx = margin + ix * (cardWidth + 10)
    const cy = y + iy * (cardHeight + 10)
    
    // Shadow/Border Box
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.3)
    doc.roundedRect(cx, cy, cardWidth, cardHeight, 3, 3, "S")
    
    // Label
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(140, 140, 140)
    doc.text(label.toUpperCase(), cx + padding, cy + padding + 2)
    
    // Value
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text(value, cx + padding, cy + padding + 12)
    
    // Comparison
    if (change !== undefined && prevLabel) {
      const isPositive = change >= 0
      doc.setFontSize(7)
      doc.setTextColor(isPositive ? 34 : 220, isPositive ? 197 : 38, isPositive ? 94 : 38) // Green vs Red
      const sign = isPositive ? "+" : ""
      const changeText = `vs ${prevLabel}: ${sign}${change.toFixed(1)}%`
      doc.text(changeText, cx + padding, cy + cardHeight - padding)
    } else if (prevLabel) {
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`vs ${prevLabel}: No prior data`, cx + padding, cy + cardHeight - padding)
    }
  }

  const prevPeriodLabel = reportType === 'daily' ? 'Yesterday' : reportType === 'weekly' ? 'Prev Week' : 'Prev Month'

  renderCard(0, 0, "Total Revenue", `${currency} ${data.summary.total_revenue.toLocaleString()}`, data.summary.revenue_change_pct, prevPeriodLabel)
  renderCard(1, 0, "Transactions", data.summary.transaction_count.toString(), data.summary.transaction_change_pct, prevPeriodLabel)
  renderCard(0, 1, "Units Sold", data.summary.units_sold.toString())
  renderCard(1, 1, "Avg Basket", `${currency} ${data.summary.avg_basket.toFixed(2)}`)

  gap(cardHeight * 2 + 20)

  // 4. TOP PRODUCTS
  checkPage(50)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("TOP PRODUCT PERFORMANCE", margin, y)
  gap(6)
  
  // Table Header
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, contentWidth, 8, "F")
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text("PRODUCT NAME", margin + 2, y + 5)
  doc.text("UNITS SOLD", margin + 110, y + 5)
  doc.text("REVENUE", margin + 140, y + 5)
  gap(8)

  // Table Body
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(40, 40, 40)
  
  if (data.breakdowns.top_products.length === 0) {
    doc.text("No product sales data available for this period.", margin + 2, y)
    gap(8)
  } else {
    data.breakdowns.top_products.forEach((p, index) => {
      checkPage(10)
      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 252)
        doc.rect(margin, y - 1, contentWidth, 8, "F")
      }
      doc.setDrawColor(240, 240, 240)
      doc.line(margin, y + 7, margin + contentWidth, y + 7)
      
      doc.text(p.name, margin + 2, y + 5, { maxWidth: 100 })
      doc.text(p.units.toString(), margin + 110, y + 5)
      doc.text(`${currency} ${p.revenue.toLocaleString()}`, margin + 140, y + 5)
      gap(8)
    })
  }
  gap(5)

  // 5. STORE & PAYMENT BREAKDOWNS
  checkPage(50)
  
  // Store Breakdown Table
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("STORE DISTRIBUTION", margin, y)
  gap(6)
  
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, (contentWidth / 2) - 5, 8, "F")
  doc.setFontSize(8)
  doc.text("STORE NAME", margin + 2, y + 5)
  doc.text("REVENUE", margin + 50, y + 5)
  
  // Payment Method Table
  doc.rect(margin + (contentWidth / 2) + 5, y, (contentWidth / 2) - 5, 8, "F")
  doc.text("PAYMENT METHOD", margin + (contentWidth / 2) + 7, y + 5)
  doc.text("REVENUE", margin + contentWidth - 25, y + 5)
  gap(8)

  const leftX = margin
  const rightX = margin + (contentWidth / 2) + 5
  
  const maxRows = Math.max(data.breakdowns.stores.length, 3) // Align heights
  for (let i = 0; i < maxRows; i++) {
    checkPage(10)
    const store = data.breakdowns.stores[i]
    
    // Left: Store
    if (store) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(store.name, leftX + 2, y + 5)
      doc.text(store.revenue.toLocaleString(), leftX + 50, y + 5)
    }

    // Right: Payments (Fix 3: M-Pesa, Card, Cash order)
    const order = ['mpesa', 'card', 'cash']
    const method = order[i]
    if (method) {
      const amount = data.breakdowns.payment_methods[method] || 0
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(method.toUpperCase(), rightX + 2, y + 5)
      doc.text(amount.toLocaleString(), margin + contentWidth - 25, y + 5)
    }
    
    doc.setDrawColor(240, 240, 240)
    doc.line(leftX, y + 8, leftX + (contentWidth / 2) - 5, y + 8)
    doc.line(rightX, y + 8, margin + contentWidth, y + 8)
    gap(8)
  }

  gap(10)

  // 6. FOOTER
  const footerY = pageHeight - 15

  // Fix 9: Add VendoFlow icon (media artifact)
  try {
    const iconPath = "C:\\Users\\Hp\\.gemini\\antigravity\\brain\\c6369966-bd6d-40c6-a15a-822e943d4f84\\media__1775466425600.png"
    // Apply 75% transparency
    doc.setGState(new (doc as any).GState({ opacity: 0.25 }))
    doc.addImage(iconPath, "PNG", margin, footerY - 5, 10, 10)
    doc.setGState(new (doc as any).GState({ opacity: 1.0 })) // Reset
  } catch (err) {
    console.warn("Could not add footer icon:", err)
  }

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  const eatTime = new Date().toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  })
  doc.text(`Generated by VendoFlow · ${eatTime} EAT`, margin + 12, footerY + 1)
  doc.text("PERFORMANCE INSIGHTS", pageWidth - margin, footerY + 1, { align: "right" })

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
