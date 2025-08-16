import { jsPDF } from "jspdf"
import { formatCurrency } from "@/lib/utils"
import { generateBarcodeDataURL } from "./barcode-generator"

// Define the type for receipt data
type ReceiptItem = {
  name: string
  sku: string
  quantity: number
  price: number
  total: number
}

type StoreInfo = {
  name: string
  address: string
  phone: string
  email: string
}

type ReceiptData = {
  receiptNumber: string
  date: Date
  items: ReceiptItem[]
  total: number
  paymentMethod: string
  paymentReference?: string
  customerName?: string
  storeInfo: StoreInfo
  paymentStatus?: string
  amountPaid?: number
  amountDue?: number
}

export async function generateReceipt(data: ReceiptData): Promise<Blob> {
  try {
    // Create a new PDF document with explicit dimensions
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 297], // Standard thermal receipt width (80mm) with adjustable length
    })

    // Set up basic document properties
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 5
    const contentWidth = pageWidth - margin * 2
    let yPos = 10

    // Helper functions for proper text alignment
    const centerText = (text: string, y: number, fontSize = 10) => {
      doc.setFontSize(fontSize)
      const textWidth = (doc.getStringUnitWidth(text) * fontSize) / doc.internal.scaleFactor
      const x = (pageWidth - textWidth) / 2
      doc.text(text, x, y)
    }

    const rightAlignText = (text: string, y: number, rightMargin = margin) => {
      const textWidth = (doc.getStringUnitWidth(text) * doc.getFontSize()) / doc.internal.scaleFactor
      const x = pageWidth - textWidth - rightMargin
      doc.text(text, x, y)
    }

    const drawHorizontalLine = (y: number) => {
      doc.setDrawColor(200, 200, 200) // Light gray
      doc.setLineWidth(0.1)
      doc.line(margin, y, pageWidth - margin, y)
    }

    const formatDate = (date: Date): string => {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    }

    // Function to handle text wrapping for long product names
    const wrapText = (text: string, maxWidth: number): string[] => {
      const words = text.split(" ")
      const lines: string[] = []
      let currentLine = ""

      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = (doc.getStringUnitWidth(testLine) * doc.getFontSize()) / doc.internal.scaleFactor

        if (testWidth > maxWidth) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      })

      if (currentLine) {
        lines.push(currentLine)
      }

      return lines
    }

    // Add store logo/name at the top - properly centered
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    centerText(data.storeInfo.name, yPos, 14)
    yPos += 6

    // Add store info - all properly centered
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80) // Dark gray
    centerText(data.storeInfo.address, yPos, 8)
    yPos += 4
    centerText(data.storeInfo.phone, yPos, 8)
    yPos += 4
    centerText(data.storeInfo.email, yPos, 8)
    yPos += 6

    // Add receipt title and horizontal line
    doc.setTextColor(0, 0, 0) // Black
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    centerText("RECEIPT", yPos, 12)
    yPos += 4
    drawHorizontalLine(yPos)
    yPos += 6

    // Add receipt details
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Receipt #: ${data.receiptNumber}`, margin, yPos)
    yPos += 4
    doc.text(`Date: ${formatDate(data.date)}`, margin, yPos)
    yPos += 4

    if (data.customerName) {
      doc.text(`Customer: ${data.customerName}`, margin, yPos)
      yPos += 4
    }

    // Add payment status with color
    if (data.paymentStatus) {
      if (data.paymentStatus === "Paid") {
        doc.setTextColor(39, 174, 96) // Green
      } else if (data.paymentStatus === "Unpaid") {
        doc.setTextColor(231, 76, 60) // Red
      } else if (data.paymentStatus === "Partial") {
        doc.setTextColor(243, 156, 18) // Orange
      }

      doc.setFont("helvetica", "bold")
      doc.text(`Status: ${data.paymentStatus}`, margin, yPos)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0) // Reset to black
      yPos += 4
    }

    // Add payment method
    doc.text(`Payment: ${data.paymentMethod}`, margin, yPos)
    yPos += 4

    if (data.paymentReference) {
      doc.text(`Ref: ${data.paymentReference}`, margin, yPos)
      yPos += 4
    }

    // Add horizontal line before items
    yPos += 2
    drawHorizontalLine(yPos)
    yPos += 6

    // Add items header with proper spacing to avoid overlapping
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("Item", margin, yPos)

    // Position quantity and price headers with adjusted spacing
    doc.text("Qty", pageWidth - 30, yPos)
    // Adjusted price column position - moved slightly to the left
    doc.text("Price", pageWidth - 20, yPos)

    yPos += 4
    drawHorizontalLine(yPos)
    yPos += 4

    // Add items with proper spacing to avoid overlapping
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)

    for (const item of data.items) {
      // Calculate available width for item name to prevent overflow
      const nameColumnWidth = pageWidth - margin * 2 - 35 // Reserve space for quantity and price

      // Wrap long product names
      const itemNameLines = wrapText(item.name, nameColumnWidth)

      // Position for item name (left-aligned)
      let itemYPos = yPos

      // Print each line of the wrapped product name
      itemNameLines.forEach((line, index) => {
        doc.text(line, margin, itemYPos)
        itemYPos += 3
      })

      // Adjust yPos based on the number of lines
      const nameHeight = Math.max(itemNameLines.length * 3, 3)

      // Position for quantity (right-aligned)
      doc.text(`${item.quantity}x`, pageWidth - 30, yPos)

      // Position for price (right-aligned) - adjusted to the left
      const priceText = formatCurrency(item.price)
      doc.text(priceText, pageWidth - 20, yPos)

      // Move down for SKU
      yPos += nameHeight

      // Position for SKU (indented)
      doc.setTextColor(100, 100, 100) // Gray for SKU
      doc.text(`SKU: ${item.sku}`, margin + 2, yPos)
      doc.setTextColor(0, 0, 0) // Back to black

      // Position for item total (right-aligned) - adjusted to the left
      const totalText = formatCurrency(item.total)
      doc.text(totalText, pageWidth - 20, yPos)

      yPos += 4

      // Add a subtle separator between items
      if (data.items.indexOf(item) < data.items.length - 1) {
        yPos += 2
        doc.setDrawColor(230, 230, 230) // Very light gray
        doc.setLineWidth(0.1)
        doc.line(margin + 5, yPos, pageWidth - margin - 5, yPos)
        yPos += 3
      } else {
        yPos += 5
      }
    }

    // Add horizontal line after items
    drawHorizontalLine(yPos)
    yPos += 6

    // Add payment details for partial payments with proper alignment and emphasis
    if (data.paymentStatus === "Partial" && data.amountPaid !== undefined && data.amountDue !== undefined) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text("Amount Paid:", margin, yPos)
      rightAlignText(formatCurrency(data.amountPaid), yPos)
      yPos += 6

      // Emphasize Amount Due with red color
      doc.setFont("helvetica", "bold")
      doc.setTextColor(231, 76, 60) // Red color for emphasis
      doc.text("Amount Due:", margin, yPos)
      rightAlignText(formatCurrency(data.amountDue), yPos)
      doc.setTextColor(0, 0, 0) // Reset to black
      yPos += 8
    }

    // Add total with proper alignment
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Total:", margin, yPos)
    rightAlignText(formatCurrency(data.total), yPos)
    yPos += 8

    // If it's a partial payment, add a reminder note
    if (data.paymentStatus === "Partial" && data.amountDue !== undefined && data.amountDue > 0) {
      doc.setFont("helvetica", "italic")
      doc.setFontSize(9)
      doc.setTextColor(231, 76, 60) // Red
      centerText(`Please pay the remaining ${formatCurrency(data.amountDue)} . Thank You.`, yPos, 9)
      doc.setTextColor(0, 0, 0) // Reset to black
      yPos += 8
    }

    // Add credit note for unpaid sales
    if (data.paymentStatus === "Unpaid") {
      doc.setFontSize(10)
      doc.setTextColor(231, 76, 60) // Red
      centerText("CREDIT SALE - PAYMENT PENDING", yPos, 10)
      doc.setTextColor(0, 0, 0) // Reset to black
      yPos += 8
    }

    // Generate and add professional barcode
    try {
      // Generate barcode as data URL using the professional barcode generator
      const barcodeDataURL = await generateBarcodeDataURL(data.receiptNumber)

      // Calculate barcode dimensions and position
      const barcodeWidth = 70
      const barcodeHeight = 20
      const barcodeX = (pageWidth - barcodeWidth) / 2

      // Add the barcode image
      doc.addImage(barcodeDataURL, "PNG", barcodeX, yPos, barcodeWidth, barcodeHeight)
      yPos += barcodeHeight + 4

      // Add receipt number below barcode
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      centerText(data.receiptNumber, yPos, 9)
      yPos += 8
    } catch (error) {
      console.error("Error generating barcode:", error)
      // If barcode fails, just show the receipt number
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      centerText(`Receipt: ${data.receiptNumber}`, yPos, 9)
      yPos += 8
    }

    // Add thank you message - properly centered
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    centerText("Thank you for your business!", yPos, 9)
    yPos += 6

    // Add footer with VendaFlow branding - properly centered
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100) // Gray
    centerText("Powered by VendoFlow", yPos, 8)
    yPos += 4

    // Add VendaFlow in green
    doc.setTextColor(169, 224, 0) // #A9E000 green
    centerText("vendoflow.com", yPos, 8)

    // Return the PDF as a blob
    return doc.output("blob")
  } catch (error) {
    console.error("Error in receipt generation:", error)
    throw new Error(`Receipt generation failed: ${error.message}`)
  }
}
