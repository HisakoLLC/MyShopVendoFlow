import JsBarcode from "jsbarcode"

/**
 * Generates a production-ready Code128 barcode as a data URL
 * @param text The text to encode in the barcode
 * @returns A Promise that resolves to a data URL containing the barcode image
 */
export async function generateBarcodeDataURL(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas element
      const canvas = document.createElement("canvas")

      // Generate the barcode using JsBarcode
      JsBarcode(canvas, text, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 50,
        displayValue: false, // We'll display the value separately
        margin: 10,
        background: "#ffffff",
      })

      // Convert the canvas to a data URL
      const dataURL = canvas.toDataURL("image/png")
      resolve(dataURL)
    } catch (error) {
      console.error("Error generating barcode:", error)
      reject(error)
    }
  })
}
