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
    <div style={{ margin: 0, padding: 0, background: "#0a0a0a", color: "#fff", minHeight: "100vh" }}>
      {children}
    </div>
  )
}
