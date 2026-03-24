import { Toaster } from "sonner"
import AdminSidebar from "./AdminSidebar"
import AdminTopbar from "./AdminTopbar"

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Toaster position="bottom-right" />
      {/* Fixed left sidebar */}
      <AdminSidebar />

      {/* Right: topbar + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
