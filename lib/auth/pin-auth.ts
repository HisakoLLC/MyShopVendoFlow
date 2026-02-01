import { hash, compare } from "bcryptjs"

const SALT_ROUNDS = 10

/**
 * Generate a random 6-digit PIN (numeric only).
 */
export function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
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
