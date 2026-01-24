/**
 * Centralized Error Handling
 * Provides consistent error messages and logging
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public userMessage?: string
  ) {
    super(message)
    this.name = "AppError"
  }
}

/**
 * Error codes and user-friendly messages
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication
  UNAUTHORIZED: "You must be signed in to perform this action.",
  FORBIDDEN: "You don't have permission to perform this action. Contact your account owner.",
  
  // Network
  NETWORK_ERROR: "Failed to load data. Check your connection.",
  OFFLINE: "You're offline. Some features may not work.",
  TIMEOUT: "Request timed out. Please try again.",
  
  // Validation
  DUPLICATE_SKU: "SKU already exists. Please use a unique SKU.",
  INVALID_INPUT: "Invalid input. Please check your data and try again.",
  MISSING_REQUIRED: "Please fill in all required fields.",
  
  // Business Logic
  OUT_OF_STOCK: "Warning: Item out of stock. Inventory will go negative.",
  INSUFFICIENT_STOCK: "Insufficient stock available.",
  INVALID_QUANTITY: "Quantity must be greater than 0.",
  
  // M-Pesa
  MPESA_TIMEOUT: "Payment request timed out. Customer may not have received prompt. Try again.",
  MPESA_CANCELLED: "Customer cancelled the payment request.",
  MPESA_INSUFFICIENT_BALANCE: "Customer has insufficient M-Pesa balance.",
  MPESA_INVALID_PHONE: "Invalid phone number format.",
  
  // File Upload
  FILE_TOO_LARGE: "Image must be under 2MB.",
  INVALID_FILE_TYPE: "Invalid file type. Please upload PNG or JPG.",
  UPLOAD_FAILED: "Failed to upload file. Please try again.",
  
  // Database
  NOT_FOUND: "The requested resource was not found.",
  DUPLICATE_ENTRY: "This record already exists.",
  CONSTRAINT_VIOLATION: "This action violates a data constraint.",
  
  // Generic
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
  SERVER_ERROR: "Server error. Please try again later.",
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof AppError) {
    return error.userMessage || error.message
  }

  if (error instanceof Error) {
    // Check if error message matches known patterns
    const errorMessage = error.message.toLowerCase()

    // Supabase errors
    if (errorMessage.includes("permission denied") || errorMessage.includes("row-level security")) {
      return ERROR_MESSAGES.FORBIDDEN
    }

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }

    if (errorMessage.includes("timeout")) {
      return ERROR_MESSAGES.TIMEOUT
    }

    if (errorMessage.includes("duplicate") || errorMessage.includes("unique")) {
      if (errorMessage.includes("sku")) {
        return ERROR_MESSAGES.DUPLICATE_SKU
      }
      return ERROR_MESSAGES.DUPLICATE_ENTRY
    }

    if (errorMessage.includes("not found")) {
      return ERROR_MESSAGES.NOT_FOUND
    }

    // Return original message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes("Error:")) {
      return error.message
    }
  }

  return fallback || ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * Log error (console in dev, external service in prod)
 */
export function logError(error: unknown, context?: string) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  if (process.env.NODE_ENV === "development") {
    console.error(`[Error${context ? ` in ${context}` : ""}]`, {
      message: errorMessage,
      stack: errorStack,
      error,
    })
  } else {
    // In production, send to error tracking service
    // Example with Sentry:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     tags: { context },
    //   })
    // }
    console.error(`[Error${context ? ` in ${context}` : ""}]`, errorMessage)
  }
}

/**
 * Check if user is offline
 */
export function isOffline(): boolean {
  if (typeof window === "undefined") return false
  return !navigator.onLine
}

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error: any): AppError {
  if (!error) {
    return new AppError(ERROR_MESSAGES.UNKNOWN_ERROR, "UNKNOWN")
  }

  const message = error.message || String(error)
  const code = error.code || "UNKNOWN"

  // Map Supabase error codes to user messages
  const codeMap: Record<string, string> = {
    "23505": ERROR_MESSAGES.DUPLICATE_ENTRY, // Unique violation
    "23503": ERROR_MESSAGES.CONSTRAINT_VIOLATION, // Foreign key violation
    "42501": ERROR_MESSAGES.FORBIDDEN, // Insufficient privilege
    "PGRST116": ERROR_MESSAGES.NOT_FOUND, // No rows returned
  }

  return new AppError(
    message,
    code,
    error.status || 500,
    codeMap[code] || getErrorMessage(error)
  )
}
