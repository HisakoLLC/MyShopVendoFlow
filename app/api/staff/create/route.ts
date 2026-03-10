import { NextRequest, NextResponse } from "next/server"
import { createStaff } from "@/app/settings/staff/actions"
import { requireAuth, requireStaffRole } from "@/lib/api/auth-helper"

/**
 * POST /api/staff/create
 * Creates a new staff member. Uses the same logic as the server action
 * but called via fetch() so that no Server Components revalidation is triggered,
 * avoiding the "Server Components render" error toast.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { error: roleError } = await requireStaffRole(supabase, user!.id, ["owner", "manager"])
    if (roleError) return roleError

    const body = await request.json()
    const { first_name, last_name, email, role, assigned_store_id, generate_pin } = body

    if (!first_name || !last_name || !email || !role) {
      return NextResponse.json(
        { error: "First name, last name, email, and role are required." },
        { status: 400 }
      )
    }

    const result = await createStaff({
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: String(email).trim(),
      role: role === "cashier" || role === "manager" || role === "owner" ? role : "cashier",
      assigned_store_id:
        typeof assigned_store_id === "string" ? String(assigned_store_id).trim() : undefined,
      generate_pin: Boolean(generate_pin),
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create staff member."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
