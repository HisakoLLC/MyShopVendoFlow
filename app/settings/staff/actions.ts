"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { z } from "zod"
import { createHash } from "crypto"

const staffSchema = z.object({
  first_name: z.string().min(1, "First name is required.").max(100, "First name is too long."),
  last_name: z.string().min(1, "Last name is required.").max(100, "Last name is too long."),
  email: z.string().email("Invalid email address.").max(200, "Email is too long."),
  role: z.enum(["cashier", "manager", "owner"], {
    errorMap: () => ({ message: "Role must be cashier, manager, or owner." }),
  }),
  assigned_store_id: z.string().optional(),
  generate_pin: z.boolean().optional(),
})

export type CreateStaffData = z.infer<typeof staffSchema>
export type UpdateStaffData = Omit<z.infer<typeof staffSchema>, "email" | "generate_pin"> & {
  staff_id: string
}

/**
 * Hash a PIN using Node.js crypto
 */
function hashPIN(pin: string): string {
  return createHash("sha256").update(pin).digest("hex")
}

/**
 * Generate a random 4-digit PIN
 */
function generatePIN(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

function normalizeAssignedStoreId(v: string | undefined): string | null {
  if (!v || v === "__none__" || !/^[0-9a-f-]{36}$/i.test(v)) return null
  return v
}

/** Normalize get_account_id() result to a string; lowercase UUIDs for consistency with PIN login. */
function normalizeAccountIdFromRpc(raw: unknown): string | null {
  if (raw == null) return null
  const s =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw[0]
        : typeof raw === "object" && raw !== null && "account_id" in raw
          ? (raw as { account_id: string }).account_id
          : String(raw)
  const trimmed = typeof s === "string" ? s.trim() : String(s)
  if (!trimmed) return null
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed)) {
    return trimmed.toLowerCase()
  }
  return trimmed
}

export async function createStaff(data: CreateStaffData) {
  const supabase = await createServerSupabaseClient()
  const assignedStoreId = normalizeAssignedStoreId(data.assigned_store_id)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create staff.")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = normalizeAccountIdFromRpc(accountIdRaw)
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify current user is owner
  const { data: currentMember, error: memberError } = await supabase
    .from("account_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .single()

  if (memberError || !currentMember || currentMember.role !== "owner") {
    throw new Error("Only owners can manage staff.")
  }

  // Check plan limits
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("plan_tier")
    .eq("account_id", accountId)
    .single()

  if (accountError) {
    throw new Error("Failed to check account plan.")
  }

  const planTier = account?.plan_tier || "starter"
  const limits: Record<string, number> = {
    starter: 2,
    core: 10,
    scale: 999999, // Unlimited
  }
  const maxStaff = limits[planTier] || 2

  // Count existing active staff
  const { data: existingStaff, error: countError } = await supabase
    .from("staff")
    .select("staff_id")
    .eq("account_id", accountId)
    .eq("active", true)

  if (countError) {
    throw new Error("Failed to check staff count.")
  }

  if ((existingStaff?.length || 0) >= maxStaff) {
    throw new Error(
      `Staff limit reached. ${planTier === "starter" ? "Upgrade to Core" : "Upgrade to Scale"} to add more staff.`
    )
  }

  // Validate assigned_store_id if role requires it
  if ((data.role === "cashier" || data.role === "manager") && !assignedStoreId) {
    throw new Error("Assigned store is required for cashier and manager roles.")
  }

  // Check for duplicate email
  const { data: existingStaffByEmail, error: emailCheckError } = await supabase
    .from("staff")
    .select("staff_id")
    .eq("account_id", accountId)
    .eq("email", data.email.trim())
    .limit(1)

  if (emailCheckError) {
    throw new Error("Failed to check for duplicate email.")
  }

  if (existingStaffByEmail && existingStaffByEmail.length > 0) {
    throw new Error("Staff member with this email already exists.")
  }

  // Generate PIN if requested
  let pinHash: string | null = null
  let generatedPIN: string | null = null
  if (data.generate_pin) {
    generatedPIN = generatePIN()
    pinHash = await hashPIN(generatedPIN)
  }

  // Create user in Supabase Auth (using admin API via service role)
  // Note: This requires service role key - we'll use a server-side approach
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error("Service role key not configured. Cannot create staff user.")
  }

  const supabaseUrl = getSupabaseUrl()
  if (!supabaseUrl) throw new Error("Supabase URL not configured.")
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // When generate_pin, staff will sign in with email + PIN; otherwise use a random temp password
  const authPassword = data.generate_pin && generatedPIN ? generatedPIN : Math.random().toString(36).slice(-12) + "A1!"

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email.trim(),
    password: authPassword,
    email_confirm: false,
  })

  if (authError || !authUser.user) {
    throw new Error(`Failed to create user: ${authError?.message || "Unknown error"}`)
  }

  // Create staff record
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .insert({
      account_id: accountId,
      email: data.email.trim(),
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      role: data.role,
      assigned_store_id: assignedStoreId,
      pin_hash: pinHash,
      active: true,
    })
    .select("staff_id, first_name, last_name, email")
    .single()

  if (staffError) {
    // Try to delete the auth user if staff creation fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    throw new Error(`Failed to create staff record: ${staffError.message}`)
  }

  // Create account_members record
  const { error: memberError2 } = await supabase.from("account_members").insert({
    account_id: accountId,
    user_id: authUser.user.id,
    role: data.role,
  })

  if (memberError2) {
    // Cleanup: delete staff and auth user
    await supabase.from("staff").delete().eq("staff_id", staff.staff_id)
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    throw new Error(`Failed to link user to account: ${memberError2.message}`)
  }

  // Don't revalidate here — client reload will refetch; avoids RSC render errors after create
  return {
    staff_id: staff.staff_id,
    email: staff.email,
    name: `${staff.first_name} ${staff.last_name}`,
    pin: generatedPIN, // Return PIN only on creation
  }
}

export async function updateStaff(data: UpdateStaffData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update staff.")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = normalizeAccountIdFromRpc(accountIdRaw)
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify current user is owner
  const { data: currentMember, error: memberError } = await supabase
    .from("account_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .single()

  if (memberError || !currentMember || currentMember.role !== "owner") {
    throw new Error("Only owners can manage staff.")
  }

  // Verify staff belongs to account
  const { data: existingStaff, error: verifyError } = await supabase
    .from("staff")
    .select("staff_id, role")
    .eq("staff_id", data.staff_id)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !existingStaff) {
    throw new Error("Staff member not found or access denied.")
  }

  const assignedStoreId = normalizeAssignedStoreId(data.assigned_store_id)

  // Validate assigned_store_id if role requires it
  if ((data.role === "cashier" || data.role === "manager") && !assignedStoreId) {
    throw new Error("Assigned store is required for cashier and manager roles.")
  }

  // Update staff
  const { error: updateError } = await supabase
    .from("staff")
    .update({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      role: data.role,
      assigned_store_id: assignedStoreId,
    })
    .eq("staff_id", data.staff_id)

  if (updateError) {
    throw new Error(`Failed to update staff: ${updateError.message}`)
  }

  // Update account_members role if changed
  // Note: We need to find the user_id by email using admin API
  const { data: staffUser, error: staffUserError } = await supabase
    .from("staff")
    .select("email")
    .eq("staff_id", data.staff_id)
    .single()

  if (!staffUserError && staffUser) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
    const supabaseUrl = getSupabaseUrl()
    if (serviceRoleKey && supabaseUrl) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (!listError && users) {
        const authUser = users.users.find((u) => u.email === staffUser.email)
        if (authUser) {
          // Update account_members role
          await supabase
            .from("account_members")
            .update({ role: data.role })
            .eq("user_id", authUser.id)
            .eq("account_id", accountId)
        }
      }
    }
  }

  revalidatePath("/settings/staff")
  return { success: true }
}

export async function deactivateStaff(staffId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to deactivate staff.")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = normalizeAccountIdFromRpc(accountIdRaw)
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify current user is owner
  const { data: currentMember, error: memberError } = await supabase
    .from("account_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .single()

  if (memberError || !currentMember || currentMember.role !== "owner") {
    throw new Error("Only owners can manage staff.")
  }

  // Verify staff belongs to account
  const { data: staff, error: verifyError } = await supabase
    .from("staff")
    .select("staff_id, role")
    .eq("staff_id", staffId)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !staff) {
    throw new Error("Staff member not found or access denied.")
  }

  // Check if this is the only active owner
  if (staff.role === "owner") {
    const { data: activeOwners, error: ownersError } = await supabase
      .from("staff")
      .select("staff_id")
      .eq("account_id", accountId)
      .eq("role", "owner")
      .eq("active", true)

    if (ownersError) {
      throw new Error("Failed to check owner count.")
    }

    if ((activeOwners?.length || 0) <= 1) {
      throw new Error("Cannot deactivate the only active owner. At least one owner must remain active.")
    }
  }

  // Deactivate staff
  const { error: updateError } = await supabase
    .from("staff")
    .update({ active: false })
    .eq("staff_id", staffId)

  if (updateError) {
    throw new Error(`Failed to deactivate staff: ${updateError.message}`)
  }

  revalidatePath("/settings/staff")
  return { success: true }
}

export async function resetStaffPIN(staffId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to reset PIN.")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = normalizeAccountIdFromRpc(accountIdRaw)
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify current user is owner
  const { data: currentMember, error: memberError } = await supabase
    .from("account_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .single()

  if (memberError || !currentMember || currentMember.role !== "owner") {
    throw new Error("Only owners can reset PINs.")
  }

  // Verify staff belongs to account
  const { data: staff, error: verifyError } = await supabase
    .from("staff")
    .select("staff_id")
    .eq("staff_id", staffId)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !staff) {
    throw new Error("Staff member not found or access denied.")
  }

  // Generate new PIN
  const newPIN = generatePIN()
  const pinHash = hashPIN(newPIN)

  // Update PIN hash
  const { error: updateError } = await supabase
    .from("staff")
    .update({ pin_hash: pinHash })
    .eq("staff_id", staffId)

  if (updateError) {
    throw new Error(`Failed to reset PIN: ${updateError.message}`)
  }

  revalidatePath("/settings/staff")
  return { success: true, pin: newPIN }
}
