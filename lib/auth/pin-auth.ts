import { hash, compare } from "bcryptjs"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"

const SALT_ROUNDS = 10

/**
 * Generate a random 6-digit PIN (numeric only).
 */
export function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Generate a globally unique 6-digit PIN.
 * Checks against all existing staff PIN hashes to ensure uniqueness.
 * Retries up to 10 times if collision occurs.
 */
export async function generateUniquePIN(): Promise<string> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  const supabaseUrl = getSupabaseUrl()
  
  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error("Server configuration error: Missing Supabase credentials")
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  for (let attempt = 0; attempt < 10; attempt++) {
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    const pinHash = await hash(pin.trim(), SALT_ROUNDS)

    // Check if this PIN hash exists globally across all accounts
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("staff_id")
      .eq("pin_hash", pinHash)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (expected), other errors are real problems
      throw new Error(`Failed to check PIN uniqueness: ${error.message}`)
    }

    if (!data) {
      // PIN is unique!
      return pin
    }
  }

  throw new Error("Unable to generate unique PIN after 10 attempts. Please try again.")
}

/**
 * Hash a PIN using bcrypt. Use for storing in staff.pin_hash.
 */
export async function hashPIN(pin: string): Promise<string> {
  return hash(pin.trim(), SALT_ROUNDS)
}

/**
 * Verify a plain PIN against a bcrypt hash. Use for PIN login.
 */
export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  return compare(pin.trim(), hash)
}
