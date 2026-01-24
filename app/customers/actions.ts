"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"

const customerSchema = z.object({
  first_name: z.string().max(100, "First name is too long.").optional(),
  last_name: z.string().max(100, "Last name is too long.").optional(),
  email: z.string().email("Invalid email address.").max(200, "Email is too long.").optional(),
  phone: z.string().max(50, "Phone number is too long.").optional(),
  notes: z.string().max(1000, "Notes are too long.").optional(),
  is_vip: z.boolean().optional(),
})

export type CreateCustomerData = z.infer<typeof customerSchema> & {
  email?: string | null
  phone?: string | null
}

export type UpdateCustomerData = z.infer<typeof customerSchema> & {
  customer_id: string
}

export async function createCustomer(data: CreateCustomerData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to create a customer.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate: At least email OR phone required
  if (!data.email?.trim() && !data.phone?.trim()) {
    throw new Error("At least email or phone is required.")
  }

  // Check for duplicates
  if (data.email?.trim()) {
    const { data: existingByEmail, error: emailCheckError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("account_id", accountId)
      .eq("email", data.email.trim())
      .limit(1)

    if (emailCheckError) {
      throw new Error("Failed to check for duplicate email.")
    }

    if (existingByEmail && existingByEmail.length > 0) {
      throw new Error("Customer with this email already exists.")
    }
  }

  if (data.phone?.trim()) {
    const { data: existingByPhone, error: phoneCheckError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("account_id", accountId)
      .eq("phone", data.phone.trim())
      .limit(1)

    if (phoneCheckError) {
      throw new Error("Failed to check for duplicate phone.")
    }

    if (existingByPhone && existingByPhone.length > 0) {
      throw new Error("Customer with this phone number already exists.")
    }
  }

  // Create customer
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      account_id: accountId,
      first_name: data.first_name?.trim() || null,
      last_name: data.last_name?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
      is_vip: data.is_vip || false,
      total_spend: 0,
      transaction_count: 0,
    })
    .select("customer_id, first_name, last_name")
    .single()

  if (customerError) {
    throw new Error(`Failed to create customer: ${customerError.message}`)
  }

  revalidatePath("/customers")
  return customer
}

export async function updateCustomer(data: UpdateCustomerData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update a customer.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Validate: At least email OR phone required
  if (!data.email?.trim() && !data.phone?.trim()) {
    throw new Error("At least email or phone is required.")
  }

  // Verify customer belongs to account
  const { data: existingCustomer, error: verifyError } = await supabase
    .from("customers")
    .select("customer_id, email, phone")
    .eq("customer_id", data.customer_id)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !existingCustomer) {
    throw new Error("Customer not found or access denied.")
  }

  // Check for duplicates (excluding current customer)
  if (data.email?.trim() && data.email.trim() !== existingCustomer.email) {
    const { data: existingByEmail, error: emailCheckError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("account_id", accountId)
      .eq("email", data.email.trim())
      .neq("customer_id", data.customer_id)
      .limit(1)

    if (emailCheckError) {
      throw new Error("Failed to check for duplicate email.")
    }

    if (existingByEmail && existingByEmail.length > 0) {
      throw new Error("Customer with this email already exists.")
    }
  }

  if (data.phone?.trim() && data.phone.trim() !== existingCustomer.phone) {
    const { data: existingByPhone, error: phoneCheckError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("account_id", accountId)
      .eq("phone", data.phone.trim())
      .neq("customer_id", data.customer_id)
      .limit(1)

    if (phoneCheckError) {
      throw new Error("Failed to check for duplicate phone.")
    }

    if (existingByPhone && existingByPhone.length > 0) {
      throw new Error("Customer with this phone number already exists.")
    }
  }

  // Update customer
  const { error: updateError } = await supabase
    .from("customers")
    .update({
      first_name: data.first_name?.trim() || null,
      last_name: data.last_name?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
      is_vip: data.is_vip ?? false,
    })
    .eq("customer_id", data.customer_id)

  if (updateError) {
    throw new Error(`Failed to update customer: ${updateError.message}`)
  }

  revalidatePath("/customers")
  return { success: true }
}

export async function updateCustomerVIP(customerId: string, isVip: boolean) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update a customer.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify customer belongs to account
  const { data: customer, error: verifyError } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("customer_id", customerId)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !customer) {
    throw new Error("Customer not found or access denied.")
  }

  // Update VIP status
  const { error: updateError } = await supabase
    .from("customers")
    .update({ is_vip: isVip })
    .eq("customer_id", customerId)

  if (updateError) {
    throw new Error(`Failed to update VIP status: ${updateError.message}`)
  }

  revalidatePath("/customers")
  return { success: true }
}

export async function updateCustomerNotes(customerId: string, notes: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update a customer.")
  }

  const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
  if (accountIdError || !accountId) {
    throw new Error("Account not found. Please complete setup first.")
  }

  // Verify customer belongs to account
  const { data: customer, error: verifyError } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("customer_id", customerId)
    .eq("account_id", accountId)
    .single()

  if (verifyError || !customer) {
    throw new Error("Customer not found or access denied.")
  }

  // Update notes
  const { error: updateError } = await supabase
    .from("customers")
    .update({ notes: notes.trim() || null })
    .eq("customer_id", customerId)

  if (updateError) {
    throw new Error(`Failed to update notes: ${updateError.message}`)
  }

  revalidatePath("/customers")
  return { success: true }
}
