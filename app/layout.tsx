import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { OfflineBanner } from "@/components/OfflineBanner"

export const metadata: Metadata = {
  title: "VendoFlow - Fashion Boutique POS",
  description: "Manage your fashion boutique inventory, sales, and products",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <OfflineBanner />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
