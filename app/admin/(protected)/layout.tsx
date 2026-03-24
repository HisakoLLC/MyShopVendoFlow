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

  // 2. Verify the session in the DB
  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .schema("vendo_admin" as any)
    .from("admin_sessions")
    .select("user_id, expires_at")
    .eq("id", sessionId)
    .maybeSingle()

  if (sessionError || !sessionData) {
    redirect("/admin/login")
  }

  // 3. Check if session expired
  if (new Date(sessionData.expires_at) < new Date()) {
    redirect("/admin/login")
  }

  // 4. Fetch the admin record for this user
  const { data: adminRecord, error: adminError } = await supabaseAdmin
    .schema("vendo_admin" as any)
    .from("admin_users")
    .select("id, email, full_name, role, avatar_url, is_active")
    .eq("id", sessionData.user_id)
    .eq("is_active", true)
    .maybeSingle()

  // 5. Inactive or missing record → error
  if (adminError || !adminRecord) {
    redirect("/admin/login")
  }

  const adminUser: AdminUser = {
    id: adminRecord.id,
    email: adminRecord.email,
    full_name: adminRecord.full_name,
    role: adminRecord.role as AdminUser["role"],
    avatar_url: adminRecord.avatar_url ?? null,
  }

  return (
    <AdminUserProvider value={adminUser}>
      <AdminShell>{children}</AdminShell>
    </AdminUserProvider>
  )
}
