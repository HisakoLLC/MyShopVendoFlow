import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { OfflineBanner } from "@/components/OfflineBanner"
import { AppShell } from "@/components/AppShell"
import { ThemeProvider } from "@/components/ThemeProvider"
import { Playfair_Display } from "next/font/google"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

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
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="VendoFlow" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${playfair.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <OfflineBanner />
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
