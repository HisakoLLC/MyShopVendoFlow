/**
 * Map technical or generic error messages to customer-friendly copy.
 * Used in error boundaries and inline error states.
 */

const GENERIC_PRODUCTION_MARKERS = [
  "omitted in production",
  "digest property",
  "Server Components render",
  "specific message is omitted",
]

/**
 * Returns true if the message looks like Next.js's generic production error.
 */
export function isGenericProductionError(message: string): boolean {
  const lower = message.toLowerCase()
  return GENERIC_PRODUCTION_MARKERS.some((m) => lower.includes(m.toLowerCase()))
}

/**
 * Known technical messages -> friendly user-facing messages.
 */
const FRIENDLY_MAP: Record<string, string> = {
  "Access denied. Only owners can manage staff.":
    "Only account owners can manage staff. If you think you should have access, try signing out and back in.",
  "Only owners can manage staff.":
    "Only account owners can manage staff. If you think you should have access, try signing out and back in.",
  "Account not found. Please complete setup first.":
    "Your account setup isn't complete. Please finish onboarding first, then try again.",
  "Account not found.":
    "We couldn't find your account. Please sign in again or complete setup.",
  "You must be signed in to create staff.":
    "Please sign in to add staff members.",
  "You must be signed in to update staff.":
    "Please sign in to update staff.",
  "You must be signed in to deactivate staff.":
    "Please sign in to deactivate staff.",
  "You must be signed in to reactivate staff.":
    "Please sign in to reactivate staff.",
  "You must be signed in to delete staff.":
    "Please sign in to remove staff.",
  "You must be signed in to reset PIN.":
    "Please sign in to reset a staff PIN.",
  "Only owners can reset PINs.":
    "Only account owners can reset staff PINs.",
  "Staff member not found or access denied.":
    "That staff member wasn't found or you don't have permission to do this.",
  "Staff member with this email already exists.":
    "A staff member with this email already exists. Use a different email.",
  "Failed to check account plan.":
    "We couldn't load your plan. Please try again in a moment.",
  "Failed to check staff count.":
    "We couldn't load staff info. Please try again.",
  "Failed to check for duplicate email.":
    "We couldn't verify that email. Please try again.",
  "PIN generation is required for staff members.":
    "A PIN is required for new staff. Please try adding the staff member again.",
}

const DEFAULT_FRIENDLY =
  "Something went wrong. Try refreshing the page. If it keeps happening, sign out and back in or contact support."

/**
 * Get a customer-friendly message from an error.
 * In production, never show the raw technical message for generic Next.js errors.
 */
export function getFriendlyErrorMessage(error: unknown, options?: { defaultMessage?: string }): string {
  const message = error instanceof Error ? error.message : String(error ?? "")
  const defaultMsg = options?.defaultMessage ?? DEFAULT_FRIENDLY

  if (!message || isGenericProductionError(message)) {
    return defaultMsg
  }

  return FRIENDLY_MAP[message] ?? message
}
