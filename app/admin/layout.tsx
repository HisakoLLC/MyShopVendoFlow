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
    <div className="min-h-screen bg-background text-foreground m-0 p-0">
      {children}
    </div>
  )
}
