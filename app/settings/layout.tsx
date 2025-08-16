import { Sidebar } from "@/components/sidebar"
import type { ReactNode } from "react"

export default function SettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </div>
  )
}
