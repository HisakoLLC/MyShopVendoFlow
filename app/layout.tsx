import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { OfflineBanner } from "@/components/OfflineBanner"
import { AppShell } from "@/components/AppShell"
import { ThemeProvider } from "@/components/ThemeProvider"

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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <OfflineBanner />
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
