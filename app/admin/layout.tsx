import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "VendoFlow Admin",
  description: "VendoFlow Admin Panel",
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a", color: "#fff" }}>
        {children}
      </body>
    </html>
  )
}
