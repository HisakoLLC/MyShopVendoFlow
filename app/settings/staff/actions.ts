"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { z } from "zod"
import { hashPIN as hashPINBcrypt, generateUniquePIN } from "@/lib/auth/pin-auth"
import { v4 as uuidv4 } from "uuid"
import { logAuditEvent } from "@/lib/audit/logger"

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
 * Helper function to check if current user is owner.
 * Checks both account_members.role and staff table (for staff users).
 */
async function isCurrentUserOwner(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  accountId: string,
  userId: string
): Promise<boolean> {
  // Check account_members first (for account owners)
  const { data: member } = await supabase
    .from("account_members")
    .select("role")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .maybeSingle()

  if (member?.role === "owner") {
    return true
  }

  // Check staff table (for staff users)
  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_user_id", userId)
    .eq("account_id", accountId)
    .eq("active", true)
    .maybeSingle()

  return staff?.role === "owner"
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
  const isOwner = await isCurrentUserOwner(supabase, accountId, user.id)
  if (!isOwner) {
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

  // Single store per account: if no store provided, use the account's store
  let resolvedStoreId = assignedStoreId
  if (!resolvedStoreId) {
    const { data: accountStores, error: storesErr } = await supabase
      .from("stores")
      .select("store_id")
      .eq("account_id", accountId)
      .order("name", { ascending: true })
      .limit(1)
    if (!storesErr && accountStores?.[0]?.store_id) {
      resolvedStoreId = accountStores[0].store_id
    }
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

  // Generate unique PIN (required for staff)
  if (!data.generate_pin) {
    throw new Error("PIN generation is required for staff members.")
  }

  const generatedPIN = await generateUniquePIN()
  const pinHash = await hashPINBcrypt(generatedPIN)

  // Generate unique staff email (internal-only, never shown to users)
  const staffId = uuidv4()
  const staffEmail = `staff-${staffId.replace(/-/g, "")}@vendoflow.internal`

  // Create Supabase auth user with PIN as password
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  const supabaseUrl = getSupabaseUrl()
  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error("Server configuration error: Missing Supabase service role key")
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: staffEmail,
    password: generatedPIN, // 6-digit PIN as password
    email_confirm: true, // Skip email verification
    user_metadata: {
      is_staff: true,
      staff_id: staffId, // For quick lookups
    },
  })

  if (authError || !authUser.user) {
    throw new Error(`Failed to create auth user: ${authError?.message ?? "Unknown error"}`)
  }

  // Create staff record with auth_user_id
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .insert({
      staff_id: staffId,
      auth_user_id: authUser.user.id,
      account_id: accountId,
      email: data.email.trim(),
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      role: data.role,
      assigned_store_id: resolvedStoreId,
      pin_hash: pinHash,
      active: true,
    })
    .select("staff_id, first_name, last_name, email")
    .single()

  if (staffError) {
    // Cleanup: delete auth user if staff creation fails
    try {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to create staff record: ${staffError.message}`)
  }

  // Create account_members record linking staff to account (service role bypasses RLS;
  // we already verified the current user is an owner).
  // account_members.role has CHECK (owner|member); staff roles cashier/manager map to "member".
  const accountMemberRole = data.role === "owner" ? "owner" : "member"
  const memberId = uuidv4()
  const { error: memberError } = await supabaseAdmin.from("account_members").insert({
    member_id: memberId,
    account_id: accountId,
    user_id: authUser.user.id,
    role: accountMemberRole,
  })

  if (memberError) {
    // Cleanup: delete staff and auth user if account_members creation fails
    try {
      await supabase.from("staff").delete().eq("staff_id", staffId)
    } catch {
      // Ignore cleanup errors
    }
    try {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to link staff to account: ${memberError.message}`)
  }

  // Log staff creation (non-blocking - don't fail if audit logging fails)
  logAuditEvent({
    account_id: accountId,
    user_id: user.id,
    staff_id: staff.staff_id,
    action_type: "staff_created",
    entity_type: "staff",
    entity_id: staff.staff_id,
    new_values: {
      email: staff.email,
      first_name: staff.first_name,
      last_name: staff.last_name,
      role: data.role,
      assigned_store_id: resolvedStoreId,
    },
    metadata: { created_by_owner: true },
  }).then(
    () => {},
    (err) => {
      console.error("Audit log error (non-blocking):", err)
    }
  )

  // Return immediately - let client handle revalidation via router.refresh()
  // This prevents Server Components render errors during revalidation

  return {
    staff_id: staff.staff_id,
    email: staff.email,
    name: `${staff.first_name} ${staff.last_name}`,
    pin: generatedPIN, // Shown to owner once only
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
  const isOwner = await isCurrentUserOwner(supabase, accountId, user.id)
  if (!isOwner) {
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

  let assignedStoreId = normalizeAssignedStoreId(data.assigned_store_id)
  if (!assignedStoreId) {
    const { data: accountStores } = await supabase
      .from("stores")
      .select("store_id")
      .eq("account_id", accountId)
      .order("name", { ascending: true })
      .limit(1)
    if (accountStores?.[0]?.store_id) assignedStoreId = accountStores[0].store_id
  }

  // Track role change for audit
  const roleChanged = existingStaff.role !== data.role

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

  // Log role change if it occurred
  if (roleChanged) {
    await logAuditEvent({
      account_id: accountId,
      user_id: user.id,
      staff_id: data.staff_id,
      action_type: "staff_role_changed",
      entity_type: "staff",
      entity_id: data.staff_id,
      old_values: { role: existingStaff.role },
      new_values: { role: data.role },
      metadata: { changed_by_owner: true },
    })
  }

  // Staff no longer have account_members; role is only in staff table (already updated above)
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
  const isOwner = await isCurrentUserOwner(supabase, accountId, user.id)
  if (!isOwner) {
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

  // Log staff deactivation
  await logAuditEvent({
    account_id: accountId,
    user_id: user.id,
    staff_id: staffId,
    action_type: "staff_deactivated",
    entity_type: "staff",
    entity_id: staffId,
    old_values: { active: true },
    new_values: { active: false },
    metadata: { deactivated_by_owner: true },
  })

  revalidatePath("/settings/staff")
  return { success: true }
}

export async function reactivateStaff(staffId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to reactivate staff.")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = normalizeAccountIdFromRpc(accountIdRaw)
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify current user is owner
  const isOwner = await isCurrentUserOwner(supabase, accountId, user.id)
  if (!isOwner) {
    throw new Error("Only owners can manage staff.")
  }

  const { data: staff, error: verifyError } = await supabase
    .from("staff")
    .select("staff_id")
    .eq("staff_id", staffId)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !staff) {
    throw new Error("Staff member not found or access denied.")
  }

  const { error: updateError } = await supabase
    .from("staff")
    .update({ active: true })
    .eq("staff_id", staffId)

  if (updateError) {
    throw new Error(`Failed to reactivate staff: ${updateError.message}`)
  }

  revalidatePath("/settings/staff")
  return { success: true }
}

export async function deleteStaff(staffId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to delete staff.")
  }

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = normalizeAccountIdFromRpc(accountIdRaw)
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify current user is owner
  const isOwner = await isCurrentUserOwner(supabase, accountId, user.id)
  if (!isOwner) {
    throw new Error("Only owners can manage staff.")
  }

  const { data: staff, error: verifyError } = await supabase
    .from("staff")
    .select("staff_id, role, active")
    .eq("staff_id", staffId)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !staff) {
    throw new Error("Staff member not found or access denied.")
  }

  if (staff.role === "owner" && staff.active) {
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
      throw new Error("Cannot delete the only active owner. Deactivate first or assign another owner.")
    }
  }

  const { error: deleteError } = await supabase
    .from("staff")
    .delete()
    .eq("staff_id", staffId)
    .eq("account_id", accountId)

  if (deleteError) {
    throw new Error(`Failed to delete staff: ${deleteError.message}`)
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
  const isOwner = await isCurrentUserOwner(supabase, accountId, user.id)
  if (!isOwner) {
    throw new Error("Only owners can reset PINs.")
  }

  // Verify staff belongs to account and get auth_user_id
  const { data: staffRow, error: verifyError } = await supabase
    .from("staff")
    .select("staff_id, auth_user_id")
    .eq("staff_id", staffId)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !staffRow) {
    throw new Error("Staff member not found or access denied.")
  }

  // Generate new unique PIN
  const newPIN = await generateUniquePIN()
  const pinHash = await hashPINBcrypt(newPIN)

  // Update auth user password if auth_user_id exists
  // CRITICAL: Both PIN hash and auth password must match for login to work
  if (staffRow.auth_user_id) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
    const supabaseUrl = getSupabaseUrl()
    if (serviceRoleKey && supabaseUrl) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      })
      const { error: passwordUpdateError } = await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id, {
        password: newPIN, // Update password to new PIN
      })
      
      if (passwordUpdateError) {
        // This is critical - if password update fails, PIN login won't work
        console.error("Failed to update auth user password:", passwordUpdateError)
        throw new Error(`Failed to update staff password: ${passwordUpdateError.message}. PIN reset incomplete.`)
      }
    } else {
      throw new Error("Server configuration error: Missing Supabase credentials for PIN reset")
    }
  }

  const { error: updateError } = await supabase
    .from("staff")
    .update({ pin_hash: pinHash })
    .eq("staff_id", staffId)

  if (updateError) {
    throw new Error(`Failed to reset PIN: ${updateError.message}`)
  }

  // Log PIN reset
  await logAuditEvent({
    account_id: accountId,
    user_id: user.id,
    staff_id: staffId,
    action_type: "staff_pin_reset",
    entity_type: "staff",
    entity_id: staffId,
    metadata: { reset_by_owner: true },
  })

  revalidatePath("/settings/staff")
  return { success: true, pin: newPIN }
}
