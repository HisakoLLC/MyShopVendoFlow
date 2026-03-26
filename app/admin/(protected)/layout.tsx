import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { AdminUserProvider, type AdminUser } from "@/lib/admin/AdminUserContext"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import AdminShell from "./_components/AdminShell"

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("vendoflow_admin_session")?.value

  // 1. No custom session → send to login
  if (!sessionId) {
    redirect("/admin/login")
  }

  // 2. Verify the session and get admin data via secure RPC
  // This bypasses PostgREST schema visibility issues in the layout.
  const { data: sessionInfo, error: sessionError } = await (supabaseAdmin
    .rpc as any)("get_admin_session_data", {
      p_session_id: sessionId
    })

  if (sessionError || !sessionInfo) {
    console.error("[AUTH_DEBUG] Layout Session Error:", sessionError)
    redirect("/admin/login")
  }

  const adminUser: AdminUser = {
    id: sessionInfo.id,
    email: sessionInfo.email,
    full_name: sessionInfo.full_name,
    role: sessionInfo.role as AdminUser["role"],
    avatar_url: sessionInfo.avatar_url ?? null,
  }

  return (
    <AdminUserProvider value={adminUser}>
      <AdminShell>{children}</AdminShell>
    </AdminUserProvider>
  )
}
