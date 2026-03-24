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
  // 1. Get session via server-side Supabase client
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. No session → send to login
  if (!user) {
    redirect("/admin/login")
  }

  // 3. Verify the user exists in admin.admin_users and is active.
  //    Uses the service-role client (bypasses RLS) — server-side only.
  const { data: adminRecord, error: adminError } = await supabaseAdmin
    .schema("admin" as any)
    .from("admin_users")
    .select("id, email, full_name, role, avatar_url, is_active")
    .eq("email", user.email!)
    .eq("is_active", true)
    .maybeSingle()

  // 4. Not in admin_users (or inactive) → sign out + redirect
  if (adminError || !adminRecord) {
    // We can't call supabase.auth.signOut() from a Server Component —
    // the middleware + login page will handle clearing stale sessions.
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
